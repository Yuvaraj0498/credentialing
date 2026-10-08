# Backend conventions

Base package: `com.zmartcredential` (main class `ZmartCredentialApplication`)

```
common/       Cross-module types (PageResponse)
config/       Spring configuration (security, CORS, OpenAPI, properties)
security/     JWT, AuthPrincipal, AuthContext, PermissionService
controller/   REST controllers (thin: validate input, call service, return DTO)
service/      Business logic, transactions, tenant scoping, permission checks
repository/   Spring Data JPA repositories
entity/       JPA entities (one per table)
dto/<module>/ Request/response records
exception/    ApiException hierarchy + GlobalExceptionHandler
util/         Helpers (crypto, csv, dates)
```

## Entities
- Lombok: `@Getter @Setter @NoArgsConstructor` (+ `@Builder @AllArgsConstructor` optional). No `@Data` (breaks equals/hashCode on proxies).
- `@Entity @Table(name = "snake_case")`; fields camelCase; Spring Boot's default naming maps camelCase -> snake_case automatically, so `@Column(name=...)` is only needed when names differ.
- IDs: `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;` For natural-key tables (`document_type`, `subscription_package`, `pricing_state`, `privilege_category`) the `@Id` is the `String code`.
- Foreign keys are mapped as plain `Long xxxId` columns (NOT `@ManyToOne`), e.g. `private Long orgId; private Long providerId;`. This keeps entities flat, avoids lazy-loading surprises, and DTO assembly happens in services. Exceptions: none.
- Enum-like VARCHAR columns are `String` in the entity; allowed values are validated in DTOs/services (constants in `domain/` classes are optional).
- Booleans: `Boolean`/`boolean` mapped to TINYINT(1).
- `created_at`/`updated_at`: `@CreationTimestamp` / `@UpdateTimestamp` with `LocalDateTime`.
- Dates: `LocalDate` for DATE, `LocalDateTime` for DATETIME, `BigDecimal` for DECIMAL.
- Composite keys (`usage_counter`, `pricing_base_rate`, `chat_read`, `reminder_schedule_provider`, `expiration_alert_doc_type`) use `@IdClass` with a static nested `Key implements Serializable` (with equals/hashCode).

## Tenancy & security
- Every request is authenticated with a JWT (except `/api/auth/**`, `/api/public/**`, swagger).
- `AuthContext.principal()` returns `AuthPrincipal(userId, orgId, role, providerId, username, displayName)`.
- `AuthContext.orgId()` returns the effective organization: the user's own org; for `platform_admin` the `X-Org-Id` request header (falls back to the first organization).
- Services MUST scope every tenant query by `orgId` and verify loaded rows belong to it (`findByIdAndOrgId`). Rows from another org -> `NotFoundException`.
- Role `provider` may only access its own `providerId` (use `AuthContext.requireProviderAccess(providerId)`).
- Permission matrix checks: `permissionService.require("provider", "update")` (entities/actions from `role_permission`). For modules not in the matrix use `AuthContext.requireRole(Role.ORG_ADMIN, ...)`.

## API
- All endpoints under `/api`. JSON, camelCase.
- Lists that are paged return `PageResponse<T>` (`content, page, size, totalElements, totalPages`); small reference lists return plain arrays.
- Errors are thrown as `NotFoundException`, `BadRequestException`, `ConflictException`, `ForbiddenException` (all extend `ApiException`) and rendered by `GlobalExceptionHandler` as `{status, error, message, fieldErrors, timestamp, path}`.
- Request DTOs use Jakarta Bean Validation (`@NotBlank`, `@Pattern`, `@Email`, `@Size`...); controllers use `@Valid`.
- Never return JPA entities or secrets (password hashes, encrypted passwords) from controllers.
