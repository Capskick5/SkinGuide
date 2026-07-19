// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import mss.userservice.config.JwtProperties;
import mss.userservice.model.User;
import mss.userservice.repository.RoleRepository;
import mss.userservice.repository.PermissionRepository;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public interface IJwtService {

    String generateAccessToken(User user);

    Claims parse(String token);

    String extractUserId(String token);

    Set<String> extractRoles(Claims claims);

    long getAccessTokenTtlSeconds();
}
