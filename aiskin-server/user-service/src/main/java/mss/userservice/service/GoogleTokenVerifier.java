package mss.userservice.service;

import mss.userservice.config.GoogleOAuthProperties;
import mss.userservice.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestOperations;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Map;
import java.util.Set;

@Service
public class GoogleTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);
    private static final Set<String> VALID_ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");
    private final GoogleOAuthProperties properties;
    private final RestOperations restOperations;

    @Autowired
    public GoogleTokenVerifier(GoogleOAuthProperties properties) {
        this(properties, createRestTemplate());
    }

    GoogleTokenVerifier(GoogleOAuthProperties properties, RestOperations restOperations) {
        this.properties = properties;
        this.restOperations = restOperations;
    }

    @SuppressWarnings("unchecked")
    public GoogleIdentity verify(String credential) {
        URI uri = UriComponentsBuilder
                .fromUriString("https://oauth2.googleapis.com/tokeninfo")
                .queryParam("id_token", credential)
                .build()
                .encode()
                .toUri();
        try {
            Map<String, Object> claims = restOperations.getForObject(uri, Map.class);
            validateClaims(claims);
            String name = stringClaim(claims, "name");
            return new GoogleIdentity(stringClaim(claims, "email"), name == null ? "Google User" : name);
        } catch (ApiException exception) {
            throw exception;
        } catch (Exception exception) {
            log.warn("Google token verification request failed: {}", exception.getClass().getSimpleName());
            throw ApiException.unauthorized("Token Google không hợp lệ hoặc đã hết hạn");
        }
    }

    private void validateClaims(Map<String, Object> claims) {
        if (claims == null || claims.containsKey("error")) {
            throw ApiException.unauthorized("Token Google không hợp lệ hoặc đã hết hạn");
        }
        if (!properties.clientId().equals(stringClaim(claims, "aud"))) {
            throw ApiException.unauthorized("Token Google không được cấp cho ứng dụng này");
        }
        if (!VALID_ISSUERS.contains(stringClaim(claims, "iss"))) {
            throw ApiException.unauthorized("Nguồn cấp token Google không hợp lệ");
        }
        if (!Boolean.parseBoolean(String.valueOf(claims.get("email_verified")))) {
            throw ApiException.unauthorized("Email Google chưa được xác thực");
        }
        if (stringClaim(claims, "email") == null) {
            throw ApiException.unauthorized("Token Google không chứa email");
        }
    }

    private String stringClaim(Map<String, Object> claims, String name) {
        Object value = claims.get(name);
        return value == null ? null : value.toString();
    }

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(3_000);
        requestFactory.setReadTimeout(5_000);
        return new RestTemplate(requestFactory);
    }

    public record GoogleIdentity(String email, String name) {
    }
}
