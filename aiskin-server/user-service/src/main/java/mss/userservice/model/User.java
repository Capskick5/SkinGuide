// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Users collection (see physical_erd.md - 1.1 Users).
 * SkinProfile is embedded (1-1).
 */
@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    /** REQUIRED, UNIQUE, stored lowercase. */
    @Indexed(unique = true)
    private String email;

    /** REQUIRED - bcrypt hash. Never serialized to clients. */
    @Field("password")
    private String password;

    /** Display name (optional at register, can be updated later). */
    private String fullName;

    /** RBAC roles. Defaults to "USER". */
    @Builder.Default
    private Set<String> roles = new HashSet<>(Set.of("USER"));

    /** Default true. false = soft deleted / disabled. */
    @Builder.Default
    private boolean isActive = true;

    /** Whether the email address has been verified via OTP. */
    @Builder.Default
    private boolean emailVerified = false;

    /** Embedded skin profile (nullable until first set). */
    private SkinProfile skinProfile;

    /** Sổ địa chỉ giao hàng (nhiều địa chỉ, một địa chỉ mặc định tại một thời điểm). */
    @Builder.Default
    private List<Address> addresses = new ArrayList<>();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
