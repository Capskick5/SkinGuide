package mss.userservice.repository;

import mss.userservice.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    org.springframework.data.domain.Page<User> findByRoles(String role, org.springframework.data.domain.Pageable pageable);
}
