// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.security;

import org.springframework.security.access.PermissionEvaluator;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.io.Serializable;

@Component
public class CustomPermissionEvaluator implements PermissionEvaluator {

    @Override
    public boolean hasPermission(Authentication authentication, Object targetDomainObject, Object permission) {
        if (authentication == null || targetDomainObject == null || !(permission instanceof String)) {
            return false;
        }

        // Luôn cho phép ADMIN truy cập mọi thứ
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (authority.getAuthority().equals("ROLE_ADMIN")) {
                return true;
            }
        }

        String targetResource = targetDomainObject.toString();
        String targetMethod = permission.toString().toUpperCase();

        String requiredAuthority = targetMethod + ":" + targetResource;

        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (authority.getAuthority().equals(requiredAuthority)) {
                return true;
            }
        }

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
        return false;
    }
}
