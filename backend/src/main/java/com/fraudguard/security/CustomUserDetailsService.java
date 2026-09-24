// com.fraudguard.security.CustomUserDetailsService
package com.fraudguard.security;

import com.fraudguard.entity.User;
import com.fraudguard.repository.UserRepository;
import java.util.Collection;
import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Spring Security UserDetailsService loading authenticated principals from PostgreSQL.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Loads user security principal by email address.
     *
     * @param email unique email address
     * @return UserDetails principal
     * @throws UsernameNotFoundException if user is not present in database
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Authentication failed: user not found with email: {}", email);
                    return new UsernameNotFoundException("User not found with email: " + email);
                });

        return new FraudGuardUserDetails(user);
    }

    /**
     * Internal UserDetails wrapper representing an authenticated FraudGuard user.
     */
    @Getter
    public static class FraudGuardUserDetails implements UserDetails {

        private final User user;
        private final List<GrantedAuthority> authorities;

        /**
         * Constructs FraudGuardUserDetails wrapping a domain User entity.
         *
         * @param user domain User entity
         */
        public FraudGuardUserDetails(User user) {
            this.user = user;
            this.authorities = List.of(new SimpleGrantedAuthority(user.getRole()));
        }

        @Override
        public Collection<? extends GrantedAuthority> getAuthorities() {
            return authorities;
        }

        @Override
        public String getPassword() {
            return user.getPasswordHash();
        }

        @Override
        public String getUsername() {
            return user.getEmail();
        }

        @Override
        public boolean isAccountNonExpired() {
            return true;
        }

        @Override
        public boolean isAccountNonLocked() {
            return true;
        }

        @Override
        public boolean isCredentialsNonExpired() {
            return true;
        }

        @Override
        public boolean isEnabled() {
            return true;
        }
    }
}
