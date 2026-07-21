// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.HashSet;
import java.util.Set;

/**
 * MongoDB Document cho Role.
 * Lưu tên Role (ADMIN, USER) và danh sách ID của các Permission liên quan.
 */
@Document(collection = "roles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Role {

    @Id
    private String id;

    @Indexed(unique = true)
    private String name;

    private String description;

    @Builder.Default
    private Set<String> permissions = new HashSet<>();
}
