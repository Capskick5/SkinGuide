package mss.userservice.service;

import mss.userservice.dto.ChangePasswordRequest;
import mss.userservice.dto.UpdateProfileRequest;
import mss.userservice.dto.UserResponse;
import mss.userservice.exception.ApiException;
import mss.userservice.model.User;
import mss.userservice.model.DeliveryAddress;
import mss.userservice.repository.UserRepository;
import mss.userservice.repository.RoleRepository;
import mss.userservice.security.RefreshTokenStore;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

public interface IUserService {

    UserResponse getById(String userId);

    UserResponse updateProfile(String userId, UpdateProfileRequest request);

    DeliveryAddress updateDeliveryAddress(String userId, DeliveryAddress address);

    void changePassword(String userId, ChangePasswordRequest request);

    Page<UserResponse> listUsers(String role, Pageable pageable);

    UserResponse setActive(String userId, boolean active);

    UserResponse setRole(String userId, String roleName);
}
