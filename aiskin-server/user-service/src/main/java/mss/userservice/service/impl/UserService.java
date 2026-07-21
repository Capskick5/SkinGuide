// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.service.impl;

import mss.userservice.dto.ChangePasswordRequest;
import mss.userservice.dto.UpdateProfileRequest;
import mss.userservice.dto.UserResponse;
import mss.userservice.exception.ApiException;
import mss.userservice.model.User;
import mss.userservice.repository.UserRepository;
import mss.userservice.repository.RoleRepository;
import mss.userservice.security.RefreshTokenStore;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import mss.userservice.service.*;

/**
 * User profile read/write operations.
 */
@Service
public class UserService implements IUserService {

    private static final int MAX_PAGE_SIZE = 100;

    private final UserRepository userRepository;

    private final RoleRepository roleRepository;

    private final PasswordEncoder passwordEncoder;

    private final RefreshTokenStore refreshTokenStore;

    public UserService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder, RefreshTokenStore refreshTokenStore) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenStore = refreshTokenStore;
    }

    public UserResponse getById(String userId) {
        return UserResponse.from(loadUser(userId));
    }

    /**
     * Update display name and/or skin profile (only non-null fields applied).
     */
    public UserResponse updateProfile(String userId, UpdateProfileRequest request) {
        User user = loadUser(userId);
        if (request.fullName() != null) {
            user.setFullName(request.fullName());
        }
        if (request.skinProfile() != null) {
            user.setSkinProfile(request.skinProfile());
        }
        return UserResponse.from(userRepository.save(user));
    }

    /**
     * Change password after verifying the current one; revokes other sessions.
     */
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = loadUser(userId);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw ApiException.badRequest("Mật khẩu hiện tại không đúng");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        refreshTokenStore.revokeAllForUser(userId);
    }

    // ---------- Admin operations ----------
    public Page<UserResponse> listUsers(String role, Pageable pageable) {
        Pageable safePageable = pageable.isPaged() ? PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), MAX_PAGE_SIZE), pageable.getSort()) : PageRequest.of(0, MAX_PAGE_SIZE);
        if (role != null && !role.isBlank()) {
            return userRepository.findByRoles(role.toUpperCase(), safePageable).map(UserResponse::from);
        }
        return userRepository.findAll(safePageable).map(UserResponse::from);
    }

    /**
     * Enable/disable an account (soft delete via isActive).
     */
    public UserResponse setActive(String userId, boolean active) {
        User user = loadUser(userId);
        user.setActive(active);
        if (!active) {
            refreshTokenStore.revokeAllForUser(userId);
        }
        return UserResponse.from(userRepository.save(user));
    }

    /**
     * Assign a single role to user (replaces existing roles).
     */
    public UserResponse setRole(String userId, String roleName) {
        String upperRole = roleName == null ? "" : roleName.trim().toUpperCase(java.util.Locale.ROOT);
        if (upperRole.isEmpty() || roleRepository.findByName(upperRole).isEmpty()) {
            throw ApiException.badRequest("Role không tồn tại");
        }
        User user = loadUser(userId);
        user.setRoles(java.util.Set.of(upperRole));
        return UserResponse.from(userRepository.save(user));
    }

    private User loadUser(String userId) {
        return userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Người dùng không tồn tại"));
    }
}
