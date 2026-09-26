// com.fraudguard.controller.CustomerController
package com.fraudguard.controller;

import com.fraudguard.dto.response.PagedResponse;
import com.fraudguard.dto.response.TransactionSummaryDto;
import com.fraudguard.entity.Transaction;
import com.fraudguard.entity.User;
import com.fraudguard.repository.TransactionRepository;
import com.fraudguard.repository.UserRepository;
import com.fraudguard.service.MapperService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller providing authenticated customer endpoints for personal transaction inquiries.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/customer")
@PreAuthorize("hasRole('CUSTOMER')")
@RequiredArgsConstructor
public class CustomerController {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final MapperService mapperService;

    /**
     * Retrieves paginated transaction history belonging exclusively to the authenticated customer.
     *
     * @param page zero-based page index (default 0)
     * @param size page size (default 20)
     * @return ResponseEntity containing PagedResponse of TransactionSummaryDto
     */
    @GetMapping("/transactions")
    public ResponseEntity<PagedResponse<TransactionSummaryDto>> getCustomerTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        User user = getAuthenticatedCustomer();
        Pageable pageable = PageRequest.of(page, size);
        Page<Transaction> txnPage = transactionRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);
        Page<TransactionSummaryDto> summaryPage = txnPage.map(mapperService::toSummaryDto);

        return ResponseEntity.ok(PagedResponse.from(summaryPage));
    }

    /**
     * Retrieves a single transaction summary enforcing strict customer ownership verification.
     *
     * @param id transaction UUID
     * @return ResponseEntity containing TransactionSummaryDto
     */
    @GetMapping("/transactions/{id}")
    public ResponseEntity<TransactionSummaryDto> getTransactionById(@PathVariable String id) {
        User user = getAuthenticatedCustomer();
        Transaction txn = transactionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Transaction not found with ID: " + id));

        // Strict customer ownership check — 403 Forbidden if accessing other user's transaction
        if (!txn.getUserId().equals(user.getId())) {
            log.warn("Unauthorized attempt by user {} to access transaction {}", user.getEmail(), id);
            throw new AccessDeniedException("Access denied: You do not have permission to view this transaction");
        }

        return ResponseEntity.ok(mapperService.toSummaryDto(txn));
    }

    private User getAuthenticatedCustomer() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found: " + email));
    }
}
