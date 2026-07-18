package mss.productservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import mss.productservice.config.JwtProperties;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public interface IJwtService {

    Claims parse(String token);

    String extractUserId(String token);

    Set<String> extractRoles(Claims claims);
}
