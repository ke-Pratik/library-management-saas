package com.studycenter.repository;

import com.studycenter.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByTenantIdAndUsername(UUID tenantId, String username);
    Optional<User> findFirstByTenantIdAndRole(UUID tenantId, String role);
}
