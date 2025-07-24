package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.User;
import com.cibofdevs.envpilot.repository.UserRepository;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Collections;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    @Autowired
    UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User Not Found with email: " + email));

        return UserPrincipal.create(user);
    }

    public static class UserPrincipal implements UserDetails {
        @Getter
        private final Long id;
        @Getter
        private final String name;
        private final String email;
        private final String password;
        private final Collection<? extends GrantedAuthority> authorities;

        public UserPrincipal(Long id, String name, String email, String password, Collection<? extends GrantedAuthority> authorities) {
            this.id = id;
            this.name = name;
            this.email = email;
            this.password = password;
            this.authorities = authorities;
        }

        public static UserPrincipal create(User user) {
            GrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + user.getRole().name());
            
            return new UserPrincipal(
                    user.getId(),
                    user.getName(),
                    user.getEmail(),
                    user.getPassword(),
                    Collections.singletonList(authority)
            );
        }

        @Override
        public String getUsername() {
            return email;
        }

        @Override
        public String getPassword() {
            return password;
        }

        @Override
        public Collection<? extends GrantedAuthority> getAuthorities() {
            return authorities;
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
