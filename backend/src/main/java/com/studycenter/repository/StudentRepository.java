package com.studycenter.repository;

import com.studycenter.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    List<Student> findByIsActiveTrue();

    List<Student> findByIsActiveFalse();

    boolean existsByAadhaarNo(String aadhaarNo);

    long countByIsActiveTrue();

    long countByIsActiveFalse();

    @Query("SELECT s FROM Student s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%', :name, '%')) ORDER BY s.name ASC")
    List<Student> searchByName(@Param("name") String name);

    @Query("SELECT s FROM Student s WHERE s.isActive = true AND s.regNo = :regNo")
    List<Student> searchActiveByRegNo(@Param("regNo") Long regNo);

   @Query("SELECT s FROM Student s WHERE s.isActive = true AND LOWER(s.name) LIKE LOWER(CONCAT('%', :name, '%')) ORDER BY s.name ASC")
   List<Student> searchActiveByName(@Param("name") String name);

   @Query("SELECT s FROM Student s WHERE s.isActive = true AND s.mobile LIKE CONCAT('%', :mobile, '%') ORDER BY s.name ASC")
   List<Student> searchActiveByMobile(@Param("mobile") String mobile);
}
