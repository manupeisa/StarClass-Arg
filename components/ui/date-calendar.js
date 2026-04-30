"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const dayNames = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];
const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" });

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day, 12));
  }

  return days;
}

function getInitialMonth(value, selectedDates) {
  const selected = parseDate(value) || parseDate(selectedDates?.[0]);
  return selected || new Date();
}

export function formatAdminDate(value) {
  const date = parseDate(value);
  return date ? dateFormatter.format(date).replace(".", "") : "Sin fecha";
}

export default function DateCalendar({
  label,
  helper,
  value = "",
  selectedDates,
  mode = "single",
  onSelect,
}) {
  const selectedDateKey = (selectedDates || []).join("|");
  const selectedDateList = useMemo(() => selectedDateKey ? selectedDateKey.split("|") : [], [selectedDateKey]);
  const [monthDate, setMonthDate] = useState(() => getInitialMonth(value, selectedDateList));
  const selectedSet = useMemo(() => new Set(selectedDateList.filter(Boolean)), [selectedDateList]);
  const days = buildMonthDays(monthDate);

  useEffect(() => {
    setMonthDate(getInitialMonth(value, selectedDateList));
  }, [selectedDateList, value]);

  function moveMonth(amount) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1, 12));
  }

  function handleSelect(date) {
    const dateValue = toDateValue(date);
    onSelect?.(dateValue);
  }

  return (
    <div className="admin-calendar-card">
      <div className="admin-calendar-copy">
        <span>{label}</span>
        <strong>{mode === "multiple" ? `${selectedSet.size} dias elegidos` : formatAdminDate(value)}</strong>
        {helper ? <p>{helper}</p> : null}
      </div>
      <div className="admin-calendar">
        <div className="admin-calendar-top">
          <button type="button" className="icon-button neutral" onClick={() => moveMonth(-1)} aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <strong>{monthFormatter.format(monthDate)}</strong>
          <button type="button" className="icon-button neutral" onClick={() => moveMonth(1)} aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="admin-calendar-grid">
          {dayNames.map((day) => (
            <span className="admin-calendar-day-name" key={day}>{day}</span>
          ))}
          {days.map((day, index) => {
            if (!day) {
              return <span className="admin-calendar-empty" key={`empty-${index}`} />;
            }

            const dateValue = toDateValue(day);
            const isSelected = mode === "multiple" ? selectedSet.has(dateValue) : value === dateValue;

            return (
              <button
                type="button"
                className={isSelected ? "admin-calendar-day selected" : "admin-calendar-day"}
                key={dateValue}
                onClick={() => handleSelect(day)}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
