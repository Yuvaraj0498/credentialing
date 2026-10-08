package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "reminder_schedule_provider")
@IdClass(ReminderScheduleProvider.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class ReminderScheduleProvider {

    @Id
    private Long scheduleId;

    @Id
    private Long providerId;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private Long scheduleId;
        private Long providerId;
    }
}
