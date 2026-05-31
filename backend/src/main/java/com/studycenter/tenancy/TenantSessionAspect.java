package com.studycenter.tenancy;

import org.aopalliance.intercept.MethodInterceptor;
import org.springframework.aop.framework.autoproxy.DefaultAdvisorAutoProxyCreator;
import org.springframework.aop.support.DefaultPointcutAdvisor;
import org.springframework.aop.support.JdkRegexpMethodPointcut;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

/**
 * Spring AOP advisor (no aspectjweaver dependency) that wraps every public
 * method on beans in com.studycenter.service. Before the method runs, if a
 * tenant is bound on the thread, SET LOCAL app.current_tenant so Postgres RLS
 * can match. SET LOCAL is transaction-scoped, so this assumes service methods
 * are @Transactional (Spring Data repository calls run in their own tx).
 */
@Configuration
public class TenantSessionAspect {

    @Bean
    public DefaultAdvisorAutoProxyCreator advisorAutoProxyCreator() {
        DefaultAdvisorAutoProxyCreator c = new DefaultAdvisorAutoProxyCreator();
        c.setProxyTargetClass(true);
        return c;
    }

    @Bean
    public DefaultPointcutAdvisor tenantSessionAdvisor(JdbcTemplate jdbc) {
        JdkRegexpMethodPointcut pc = new JdkRegexpMethodPointcut();
        pc.setPattern("com\\.studycenter\\.service\\..*");

        MethodInterceptor advice = invocation -> {
            UUID tenantId = TenantContext.getTenantId();
            if (tenantId != null) {
                try {
                    jdbc.execute("SET LOCAL app.current_tenant = '" + tenantId + "'");
                } catch (Exception ignored) {
                    // outside an active transaction SET LOCAL is a no-op
                }
            }
            return invocation.proceed();
        };

        DefaultPointcutAdvisor advisor = new DefaultPointcutAdvisor(pc, advice);
        // Transaction advisor is set to order=100 (StudycenterApplication).
        // We want this advisor to run INSIDE the transaction so SET LOCAL applies.
        // Larger order = lower precedence = runs later (inside).
        advisor.setOrder(200);
        return advisor;
    }
}
