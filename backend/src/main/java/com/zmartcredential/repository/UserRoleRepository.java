package com.zmartcredential.repository;

import com.zmartcredential.entity.UserRole;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

    List<UserRole> findAllByOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    /** The first role (lowest id) with this access level — for users created without a chosen role. */
    default Long defaultFor(String accessLevel) {
        String level = "admin".equals(accessLevel) ? "org_admin" : accessLevel;
        return findAll().stream().filter(r -> level != null && level.equals(r.getAccessLevel()))
                .map(com.zmartcredential.entity.UserRole::getId).min(Long::compare).orElse(null);
    }

    /** True when the role exists and has been disabled. */
    default boolean isDisabled(Long id) {
        return id != null && findById(id).map(r -> Boolean.FALSE.equals(r.getActive())).orElse(false);
    }
}
