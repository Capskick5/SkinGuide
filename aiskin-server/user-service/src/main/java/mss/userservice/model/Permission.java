// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * MongoDB Document cho Permission.
 * Lưu tên quyền, tài nguyên (API path), HTTP method, và service name.
 */
@Document(collection = "permissions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@CompoundIndex(name = "resource_method_idx", def = "{'resource': 1, 'method': 1}", unique = true)
public class Permission {

    @Id
    private String id;

    private String name;

    private String resource;

    private String method;

    private String service;

    private String description;
}
