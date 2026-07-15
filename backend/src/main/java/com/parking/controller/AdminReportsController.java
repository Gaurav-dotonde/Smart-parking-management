package com.parking.controller;

import com.parking.dto.*;
import com.parking.service.AdminReportsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportsController {

    private final AdminReportsService adminReportsService;

    @GetMapping("/summary")
    public ResponseEntity<ReportsSummaryResponse> getSummary(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
      return ResponseEntity.ok(adminReportsService.getSummary(fromDate, toDate));
    }

    @GetMapping("/booking-status")
    public ResponseEntity<ReportsBookingStatusResponse> getBookingStatus(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
      return ResponseEntity.ok(adminReportsService.getBookingStatus(fromDate, toDate));
    }

    @GetMapping("/revenue")
    public ResponseEntity<ReportsRevenueResponse> getRevenue(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
      return ResponseEntity.ok(adminReportsService.getRevenue(fromDate, toDate));
    }

    @GetMapping("/top-slots")
    public ResponseEntity<List<ReportsTopSlotResponse>> getTopSlots(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
      return ResponseEntity.ok(adminReportsService.getTopSlots(fromDate, toDate));
    }

    @GetMapping("/bookings")
    public ResponseEntity<List<ReportsBookingRowResponse>> getBookings(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate
    ) {
      return ResponseEntity.ok(adminReportsService.getBookings(fromDate, toDate));
    }
}
