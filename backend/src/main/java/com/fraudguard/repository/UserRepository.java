// com.fraudguard.repository.UserRepository
package com.fraudguard.repository;

import com.fraudguard.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for User accounts and authentication credentials.
 */
@Repository
public interface UserRepository extends JpaRepository<User, String> {

    /**
     * Retrieves an active user record by their unique email address.
     *
     * @param email user login email address
     * @return Optional containing matched User or empty if not found
     */
    Optional<User> findByEmail(String email);

    /**
     * Checks whether an account already exists with the provided email.
     *
     * @param email email to verify
     * @return true if user exists, false otherwise
     */
    boolean existsByEmail(String email);
}
