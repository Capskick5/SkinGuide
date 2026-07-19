// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.userservice.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

/**
 * Enables auditing so @CreatedDate on entities is populated automatically.
 */
@Configuration
@EnableMongoAuditing
public class MongoConfig {
}
