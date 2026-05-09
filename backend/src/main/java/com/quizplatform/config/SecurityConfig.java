package com.quizplatform.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtToUserContextFilter userFilter) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/health", "/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(j -> {}))
            // Must run AFTER BearerTokenAuthenticationFilter so the JWT has
            // been validated and SecurityContextHolder.getAuthentication()
            // returns a JwtAuthenticationToken. (Originally placed after
            // UsernamePasswordAuthenticationFilter, which is too early — the
            // bearer filter runs later, so our filter saw a null principal
            // and never upserted the user.)
            .addFilterAfter(userFilter, BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    // Spring Boot auto-registers any @Component that implements jakarta.servlet.Filter
    // as a global Tomcat filter. We don't want that — JwtToUserContextFilter only
    // belongs inside the Spring Security chain (added via addFilterAfter above).
    // The duplicate registration is what was triggering the CGLIB proxy + null-logger
    // failure at startup. setEnabled(false) keeps the bean discoverable for Security
    // but suppresses Tomcat-level installation.
    @Bean
    public FilterRegistrationBean<JwtToUserContextFilter> jwtFilterRegistration(JwtToUserContextFilter filter) {
        var reg = new FilterRegistrationBean<>(filter);
        reg.setEnabled(false);
        return reg;
    }
}
