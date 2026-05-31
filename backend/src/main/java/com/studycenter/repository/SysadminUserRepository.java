package com.studycenter.repository;

import com.studycenter.entity.SysadminUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SysadminUserRepository extends JpaRepository<SysadminUser, Long> {
    Optional<SysadminUser> findByUsername(String username);
}
