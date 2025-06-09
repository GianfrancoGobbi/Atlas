
import React, { useState, useMemo, useRef, useEffect, CSSProperties } from 'react';
import { Turno, UserProfile, UserRole } from '../../types';
import { APPOINTMENT_STATUS_COLORS, USER_FRIENDLY_STATUS } from '../../constants';
import { TARGET_TIMEZONE_IANA, getLocalDateObjectForTargetTimezone } from '../../utils/timezones';


interface AppointmentCalendarProps {
  appointments: Turno[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (appointmentId: string) => void;
  highlightedDate?: Date | null; // This is a local Date object
  patients: Pick<UserProfile, 'id' | 'nombre' | 'apellido'>[];
  currentUserRole: UserRole | null;
  currentUserProfileId?: string;
}

const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({ 
  appointments, 
  onDateClick, 
  onEventClick,
  highlightedDate,
  patients,
  currentUserRole,
  currentUserProfileId
}) => {
  // currentMonthDate determines the month/year of the calendar grid. Its local parts represent the target timezone.
  const [currentMonthDate, setCurrentMonthDate] = useState(() => getLocalDateObjectForTargetTimezone(TARGET_TIMEZONE_IANA)); 
  const [hoveredDayInfo, setHoveredDayInfo] = useState<{
    date: Date; // This is the local Date object of the hovered calendar cell
    appointments: Turno[]; // Appointments that fall on this local date when viewed in TARGET_TIMEZONE_IANA
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({ visibility: 'hidden' });

  const appointmentsByDayInTargetTimezone = useMemo(() => {
    const map = new Map<string, Turno[]>();
    appointments.forEach(app => {
      // app.fechaHoraInicio is a UTC ISO string
      const utcDateObj = new Date(app.fechaHoraInicio);
      
      // Get date components *as if* this UTC time was displayed in TARGET_TIMEZONE_IANA
      const formatter = new Intl.DateTimeFormat('en-CA', { // 'sv-SE' or 'en-CA' for YYYY-MM-DD
          year: 'numeric', month: '2-digit', day: '2-digit',
          timeZone: TARGET_TIMEZONE_IANA
      });
      const parts = formatter.formatToParts(utcDateObj);
      const y = parts.find(p => p.type === 'year')?.value;
      const mo = parts.find(p => p.type === 'month')?.value;
      const d = parts.find(p => p.type === 'day')?.value;

      if (y && mo && d) {
        const dateKey = `${y}-${mo}-${d}`; // YYYY-MM-DD in TARGET_TIMEZONE_IANA
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(app);
      }
    });
    return map;
  }, [appointments]);

  const patientNameMap = useMemo(() => {
    const map = new Map<string, string>();
    patients.forEach(p => map.set(p.id, `${p.nombre} ${p.apellido}`));
    return map;
  }, [patients]);

  useEffect(() => {
    if (hoveredDayInfo && popoverRef.current) {
      const popover = popoverRef.current;
      const popoverRect = popover.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const offset = 15; const margin = 10; 
      let newLeft = hoveredDayInfo.mouseX + offset;
      let newTop = hoveredDayInfo.mouseY + offset;

      if (newLeft + popoverRect.width + margin > viewportWidth) newLeft = hoveredDayInfo.mouseX - popoverRect.width - offset;
      if (newLeft < margin) newLeft = margin;
      if (newLeft + popoverRect.width + margin > viewportWidth) newLeft = viewportWidth - popoverRect.width - margin;
      
      if (newTop + popoverRect.height + margin > viewportHeight) newTop = hoveredDayInfo.mouseY - popoverRect.height - offset;
      if (newTop < margin) newTop = margin;
      if (newTop + popoverRect.height + margin > viewportHeight) newTop = viewportHeight - popoverRect.height - margin;

      setPopoverStyle({
        position: 'fixed',
        top: `${Math.max(margin, newTop)}px`,
        left: `${Math.max(margin, newLeft)}px`,
        minWidth: '180px',
        visibility: 'visible',
        zIndex: 50, 
      });
    } else {
      setPopoverStyle({ visibility: 'hidden' });
    }
  }, [hoveredDayInfo]);


  const year = currentMonthDate.getFullYear(); // Local year from currentMonthDate
  const month = currentMonthDate.getMonth(); // 0-indexed local month

  const firstDayOfMonth = new Date(year, month, 1); // Start of month in local parts
  const lastDayOfMonth = new Date(year, month + 1, 0); // End of month in local parts
  const startingDayOfWeek = firstDayOfMonth.getDay(); 
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(new Date(year, month, day)); // Local Date objects for calendar grid
  
  const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
  while (calendarDays.length < totalCells ) calendarDays.push(null);


  const prevMonth = () => { 
    setCurrentMonthDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(prev.getMonth() - 1);
        return newDate;
    }); 
    setHoveredDayInfo(null); 
  };
  const nextMonth = () => { 
    setCurrentMonthDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(prev.getMonth() + 1);
        return newDate;
    }); 
    setHoveredDayInfo(null); 
  };

  const isSameLocalDate = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };
  
  const todayLocal = useMemo(() => getLocalDateObjectForTargetTimezone(TARGET_TIMEZONE_IANA), []); // "Today" in target timezone

  const handleDayMouseEnter = (date: Date | null, event: React.MouseEvent<HTMLDivElement>) => {
    if (!date) return;
    // `date` is the local Date object of the calendar cell.
    // Use its local YYYY-MM-DD components as the key for appointmentsByDayInTargetTimezone map.
    const yearKey = date.getFullYear();
    const monthKey = (date.getMonth() + 1).toString().padStart(2, '0');
    const dayKey = date.getDate().toString().padStart(2, '0');
    const dateKeyForMap = `${yearKey}-${monthKey}-${dayKey}`;

    const dayAppointments = appointmentsByDayInTargetTimezone.get(dateKeyForMap) || [];
    if (dayAppointments.length > 0) {
      setHoveredDayInfo({
        date, // The local Date object for the cell, used for popover title
        appointments: dayAppointments,
        mouseX: event.clientX,
        mouseY: event.clientY,
      });
    } else {
      setHoveredDayInfo(null);
    }
  };

  const handleDayMouseLeave = () => { /* Popover handles its own leave */ };
  const handlePopoverMouseEnter = () => { if (hoveredDayInfo) setHoveredDayInfo(prev => prev ? { ...prev } : null); };
  const handlePopoverMouseLeave = () => setHoveredDayInfo(null);

  const formatTimeForPopover = (utcIsoString: string) => 
    new Date(utcIsoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: TARGET_TIMEZONE_IANA });

  // formatDateForPopoverTitle takes a local Date object (from the cell)
  // and formats its local date components.
  const formatDateForPopoverTitle = (localDate: Date) => 
    localDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });


  return (
    <div className="bg-white p-4 sm:p-6 shadow rounded-lg select-none relative">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} aria-label="Mes anterior" className="p-2 rounded-full hover:bg-slate-100 text-brand-gray hover:text-primary transition-colors"> {/* text-slate-600 to text-brand-gray */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-lg sm:text-xl font-semibold text-primary-dark" aria-live="polite"> {/* text-slate-700 to text-primary-dark */}
          {monthNames[month]} {year}
        </h2>
        <button onClick={nextMonth} aria-label="Mes siguiente" className="p-2 rounded-full hover:bg-slate-100 text-brand-gray hover:text-primary transition-colors"> {/* text-slate-600 to text-brand-gray */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px text-center text-sm text-brand-gray border-t border-l border-slate-200"> {/* text-slate-600 to text-brand-gray */}
        {daysOfWeek.map(day => (
          <div key={day} className="py-2 font-medium bg-slate-50 border-b border-r border-slate-200">{day}</div>
        ))}
        
        {calendarDays.map((date, index) => { // date is a local Date object for the cell
          const dateKeyForMap = date ? `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}` : '';
          const dayAppointments = date ? appointmentsByDayInTargetTimezone.get(dateKeyForMap) || [] : [];
          
          const isClickable = onDateClick && date; 
          const isCurrentMonthDay = date && date.getMonth() === month; // month is 0-indexed local month of currentMonthDate
          const isTodayCell = date && isSameLocalDate(date, todayLocal); 
          const isHighlightedCell = date && isSameLocalDate(date, highlightedDate);

          let cellClasses = "py-2 sm:py-3 relative border-b border-r border-slate-200";
          if (isClickable && isCurrentMonthDay) cellClasses += " cursor-pointer hover:bg-primary-light hover:text-primary-dark transition-colors"; // hover text to primary-dark
          else if (!isCurrentMonthDay && date) cellClasses += " text-slate-400"; 
          else if (!date) cellClasses += " bg-slate-50"; 

          if (isTodayCell && isCurrentMonthDay) cellClasses += " bg-primary-light font-semibold text-primary-dark"; // bg-cyan-100 to bg-primary-light
          if (isHighlightedCell && isCurrentMonthDay) cellClasses += " ring-2 ring-primary ring-inset";

          const uniqueAppointmentStatuses = date && isCurrentMonthDay 
            ? Array.from(new Set(dayAppointments.map(app => app.estado))) 
            : [];

          return (
            <div
              key={date ? date.toISOString() : `empty-${index}`} // Using local date's ISOString (which will have system offset) is fine for key
              className={cellClasses}
              onClick={() => isClickable && isCurrentMonthDay && onDateClick(date)} // date is local
              onMouseEnter={(e) => handleDayMouseEnter(date, e)}
              onMouseLeave={handleDayMouseLeave}
              role={isClickable && isCurrentMonthDay ? "button" : undefined}
              tabIndex={isClickable && isCurrentMonthDay ? 0 : undefined}
              aria-label={date ? `Día ${date.getDate()}, ${monthNames[date.getMonth()]}` : 'Celda vacía'}
            >
              {date && <span className="relative z-10">{date.getDate()}</span>}
              {uniqueAppointmentStatuses.length > 0 && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-0.5 justify-center z-0">
                  {uniqueAppointmentStatuses.slice(0, 3).map((status, i) => (
                    <span
                      key={i}
                      className={`block w-1.5 h-1.5 rounded-full ${APPOINTMENT_STATUS_COLORS[status]?.dotClass || 'bg-gray-400'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hoveredDayInfo && hoveredDayInfo.date && ( // Ensure date is present
        <div
          ref={popoverRef}
          className="bg-white shadow-xl rounded-lg p-3 border border-slate-200 max-w-xs text-xs"
          style={popoverStyle}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
        >
          <h4 className="font-semibold text-primary-dark mb-2 border-b pb-1"> {/* text-slate-700 to text-primary-dark */}
            Turnos para {formatDateForPopoverTitle(hoveredDayInfo.date)}
          </h4>
          {hoveredDayInfo.appointments.length > 0 ? (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {hoveredDayInfo.appointments.map(app => (
                <li 
                  key={app.id} 
                  className="p-1.5 rounded hover:bg-slate-100 cursor-pointer"
                  onClick={() => onEventClick && onEventClick(app.id)}
                >
                  <p className="font-medium text-primary-dark">
                    {formatTimeForPopover(app.fechaHoraInicio)} - {formatTimeForPopover(app.fechaHoraFin)}
                  </p>
                  <p className="text-brand-gray"> {/* text-slate-600 to text-brand-gray */}
                    {currentUserRole === UserRole.TERAPEUTA 
                      ? (patientNameMap.get(app.pacienteId) || `ID Paciente: ${app.pacienteId.substring(0,6)}...`)
                      : currentUserRole === UserRole.PACIENTE && app.pacienteId === currentUserProfileId 
                        ? "Mi Turno" 
                        : "Turno"}
                    <span className={`text-xs ml-1 font-medium ${APPOINTMENT_STATUS_COLORS[app.estado]?.textClass || 'text-brand-gray'}`}> {/* text-slate-500 to text-brand-gray */}
                      ({USER_FRIENDLY_STATUS[app.estado] || app.estado})
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-brand-gray">No hay turnos este día.</p> /* text-slate-500 to text-brand-gray */
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-brand-gray text-center"> {/* text-slate-500 to text-brand-gray */}
        {onDateClick ? "Haz clic en un día para resaltarlo. Usa el botón 'Agendar' para nuevos turnos." : "Calendario de visualización."}
      </p>
    </div>
  );
};