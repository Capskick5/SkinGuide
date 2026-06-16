package mss.productservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "categories")
public class Category {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true)
    private String slug;

    private String description;

    private Integer displayOrder;

    @Builder.Default
    private Boolean isActive = true;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
