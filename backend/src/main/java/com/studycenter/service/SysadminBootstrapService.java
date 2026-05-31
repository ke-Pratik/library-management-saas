package com.studycenter.service;

import com.studycenter.entity.SysadminUser;
import com.studycenter.repository.SysadminUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SysadminBootstrapService {

    private final SysadminUserRepository sysadminUserRepository;

    @Value("${app.sysadmin.username}")
    private String sysadminUsername;

    @Value("${app.sysadmin.password.bcrypt}")
    private String sysadminPasswordBcrypt;

    @EventListener(ApplicationReadyEvent.class)
    public void bootstrap() {
        if (sysadminUsername == null || sysadminUsername.isBlank()) return;
        sysadminUserRepository.findByUsername(sysadminUsername).orElseGet(() -> {
            SysadminUser u = SysadminUser.builder()
                    .username(sysadminUsername)
                    .password(sysadminPasswordBcrypt)
                    .isActive(true)
                    .build();
            SysadminUser saved = sysadminUserRepository.save(u);
            log.info("Bootstrapped sysadmin user: {}", saved.getUsername());
            return saved;
        });
    }
}
