package com.zmartcredential.repository;

import com.zmartcredential.entity.UsCity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsCityRepository extends JpaRepository<UsCity, Long> {

    List<UsCity> findByStateCodeOrderByNameAsc(String stateCode);

    List<UsCity> findAllByOrderByStateCodeAscNameAsc();
}
