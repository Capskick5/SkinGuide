package mss.userservice.security;

import org.springframework.security.access.PermissionEvaluator;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.io.Serializable;

/**
 * Custom PermissionEvaluator để hỗ trợ cú pháp @PreAuthorize("hasPermission('Resource', 'Method')")
 */
@Component
public class CustomPermissionEvaluator implements PermissionEvaluator {

    @Override
    public boolean hasPermission(Authentication authentication, Object targetDomainObject, Object permission) {
        if (authentication == null || targetDomainObject == null || !(permission instanceof String)) {
            return false;
        }

        // Luôn cho phép ADMIN truy cập mọi thứ để tránh lỗi chicken-and-egg khi khởi tạo hệ thống
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (authority.getAuthority().equals("ROLE_ADMIN")) {
                return true;
            }
        }

        // Định dạng permission được lưu trong JWT: "METHOD:Resource" (VD: "GET:/api/admin/users")
        String targetResource = targetDomainObject.toString();
        String targetMethod = permission.toString().toUpperCase();
        
        // Vì có thể có các biến {id} trong path, ta dùng String pattern matching đơn giản hoặc chính xác.
        // Trong phiên bản này, ta map chính xác với chuỗi được định nghĩa trong DB.
        String requiredAuthority = targetMethod + ":" + targetResource;

        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (authority.getAuthority().equals(requiredAuthority)) {
                return true;
            }
        }
        
        // Hoặc kiểm tra quyền wildcard nếu cần (VD: "*:/api/admin/users")
        String wildcardAuthority = "ANY:" + targetResource;
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (authority.getAuthority().equals(wildcardAuthority)) {
                return true;
            }
        }

        return false;
    }

    @Override
    public boolean hasPermission(Authentication authentication, Serializable targetId, String targetType, Object permission) {
        // Not used in our setup
        return false;
    }
}
