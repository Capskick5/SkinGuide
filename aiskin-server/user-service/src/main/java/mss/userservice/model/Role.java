package mss.userservice.model;

/**
 * Vai trò người dùng cho RBAC.
 * Lưu trong JWT dưới dạng authority "ROLE_USER", "ROLE_ADMIN".
 */
public enum Role {
    USER,
    ADMIN
}
