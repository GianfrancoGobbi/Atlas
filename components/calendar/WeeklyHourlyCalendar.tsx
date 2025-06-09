
import React, { useMemo } from 'react';
import { Turno, UserProfile } from '../../types';
import { APPOINTMENT_STATUS_COLORS, USER_FRIENDLY_STATUS } from '../../constants';
import { TARGET_TIMEZONE_IANA, getLocalDateObjectForTargetTimezone, formatTargetTimezoneDateTimeLocalToUTCISO } from '../../utils/timezones';


interface WeeklyHourlyCalendarProps {
  currentDate: Date; // A Date object whose local parts represent a date in TARGET_TIMEZONE_IANA
  appointments: Turno[];
  patients: Pick<UserProfile, 'id' | 'nombre' | 'apellido'>[];
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onAppointmentClick?: (appointment: Turno) => void;
}

const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const timeSlotsStartHour = 7;
const timeSlotsEndHour = 21; 

export const WeeklyHourlyCalendar: React.FC<WeeklyHourlyCalendarProps> = ({
  currentDate, // This date's local components are already in TARGET_TIMEZONE_IANA
  appointments,
  patients,
  onNavigateWeek,
  onAppointmentClick,
}) => {
  const patientNameMap = useMemo(() => {
    const map = new Map<string, string>();
    patients.forEach(p => map.set(p.id, `${p.nombre} ${p.apellido}`));
    return map;
  }, [patients]);

  const { weekDays, weekStart, weekEnd } = useMemo(() => {
    // currentDate is a Date object whose local parts are already in TARGET_TIMEZONE_IANA context
    const start = new Date(currentDate); 
    start.setDate(currentDate.getDate() - currentDate.getDay()); // Get Sunday of that week using local arithmetic
    start.setHours(0, 0, 0, 0); // Ensure it's the beginning of the day in its local context

    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Get Saturday of that week
    end.setHours(23, 59, 59, 999); // Ensure it's the end of the day in its local context

    const days: Date[] = []; // Array of Date objects, each representing a day (local parts in TARGET_TIMEZONE_IANA)
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return { weekDays: days, weekStart: start, weekEnd: end };
  }, [currentDate]);

  const filteredAppointments = useMemo(() => {
    // weekStart and weekEnd are Date objects whose local parts are in TARGET_TIMEZONE_IANA.
    // Convert their local parts to "YYYY-MM-DDTHH:MM:SS" strings representing time in TARGET_TIMEZONE_IANA,
    // then convert those strings to true UTC for comparison.
    const wsYear = weekStart.getFullYear();
    const wsMonth = (weekStart.getMonth() + 1).toString().padStart(2, '0');
    const wsDay = weekStart.getDate().toString().padStart(2, '0');
    const weekStartLocalStr = `${wsYear}-${wsMonth}-${wsDay}T00:00:00`; // Start of day in target zone
    const trueWeekStartUTCStr = formatTargetTimezoneDateTimeLocalToUTCISO(weekStartLocalStr, TARGET_TIMEZONE_IANA);
    const trueWeekStartUTC = new Date(trueWeekStartUTCStr);

    const weYear = weekEnd.getFullYear();
    const weMonth = (weekEnd.getMonth() + 1).toString().padStart(2, '0');
    const weDay = weekEnd.getDate().toString().padStart(2, '0');
    const weekEndLocalStr = `${weYear}-${weMonth}-${weDay}T23:59:59`; // End of day in target zone
    const trueWeekEndUTCStr = formatTargetTimezoneDateTimeLocalToUTCISO(weekEndLocalStr, TARGET_TIMEZONE_IANA);
    const trueWeekEndUTC = new Date(trueWeekEndUTCStr);
    
    return appointments.filter(app => {
      const appDateUTC = new Date(app.fechaHoraInicio); // UTC from DB
      return appDateUTC >= trueWeekStartUTC && appDateUTC <= trueWeekEndUTC;
    });
  }, [appointments, weekStart, weekEnd]);

  const timeLabels = useMemo(() => {
    const labels: string[] = [];
    for (let hour = timeSlotsStartHour; hour < timeSlotsEndHour; hour++) {
      labels.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return labels;
  }, []);

  const getAppointmentPositionAndStyle = (app: Turno, dayDateInTargetTimezone: Date): React.CSSProperties | null => {
    const appStartTimeUTC = new Date(app.fechaHoraInicio);
    const appEndTimeUTC = new Date(app.fechaHoraFin);

    // Get app start time components in TARGET_TIMEZONE_IANA
    const dateTimePartFormatter = new Intl.DateTimeFormat('en-CA', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZone: TARGET_TIMEZONE_IANA
    });

    const startParts = dateTimePartFormatter.formatToParts(appStartTimeUTC);
    const appStartYearTarget = parseInt(startParts.find(p => p.type === 'year')?.value || '0');
    const appStartMonthTarget = parseInt(startParts.find(p => p.type === 'month')?.value || '0') - 1; 
    const appStartDayTarget = parseInt(startParts.find(p => p.type === 'day')?.value || '0');
    let appStartHourTarget = parseInt(startParts.find(p => p.type === 'hour')?.value || '0');
    if (appStartHourTarget === 24) appStartHourTarget = 0; 
    const appStartMinuteTarget = parseInt(startParts.find(p => p.type === 'minute')?.value || '0');
    
    // Compare app's date (in target timezone) with the current column's date (local parts of dayDateInTargetTimezone)
    if (appStartYearTarget !== dayDateInTargetTimezone.getFullYear() ||
        appStartMonthTarget !== dayDateInTargetTimezone.getMonth() ||
        appStartDayTarget !== dayDateInTargetTimezone.getDate()) {
      return null; 
    }
    
    const endParts = dateTimePartFormatter.formatToParts(appEndTimeUTC); 
    let appEndHourTarget = parseInt(endParts.find(p => p.type === 'hour')?.value || '0');
    if (appEndHourTarget === 24) appEndHourTarget = 0;
    const appEndMinuteTarget = parseInt(endParts.find(p => p.type === 'minute')?.value || '0');
    
    let durationMinutes = (appEndHourTarget * 60 + appEndMinuteTarget) - (appStartHourTarget * 60 + appStartMinuteTarget);
    if (durationMinutes <= 0) { 
        const appEndDateTargetDay = parseInt(endParts.find(p => p.type === 'day')?.value || '0');
        if (appEndDateTargetDay !== appStartDayTarget || appEndHourTarget < appStartHourTarget ) {
             durationMinutes = ((appEndHourTarget + 24) * 60 + appEndMinuteTarget) - (appStartHourTarget * 60 + appStartMinuteTarget);
        } else {
            durationMinutes = 0; 
        }
    }
    if (durationMinutes <= 0) return null;


    if (appStartHourTarget >= timeSlotsEndHour || (appStartHourTarget * 60 + appStartMinuteTarget + durationMinutes) <= timeSlotsStartHour * 60) {
      if(!(appStartHourTarget < timeSlotsStartHour && (appStartHourTarget*60+appStartMinuteTarget+durationMinutes > timeSlotsStartHour*60)))
      return null; 
    }
    
    const pixelsPerHour = 60; 
    let topOffset = ((Math.max(timeSlotsStartHour, appStartHourTarget) - timeSlotsStartHour) * pixelsPerHour) + 
                    ( (appStartHourTarget >= timeSlotsStartHour ? appStartMinuteTarget : 0) / 60) * pixelsPerHour;

    let effectiveStartMinutesInGrid = Math.max(timeSlotsStartHour * 60, appStartHourTarget * 60 + appStartMinuteTarget);
    let effectiveEndMinutesInGrid = Math.min(timeSlotsEndHour * 60, appStartHourTarget * 60 + appStartMinuteTarget + durationMinutes);
    
    let heightMinutes = effectiveEndMinutesInGrid - effectiveStartMinutesInGrid;
    if (heightMinutes <=0) return null;

    const height = (heightMinutes / 60) * pixelsPerHour;

    if (height <= 0) return null;

    return { top: `${topOffset}px`, height: `${height}px`, position: 'absolute', left: '2px', right: '2px', zIndex: 10 };
  };

  const todayInTargetTimezone = useMemo(() => getLocalDateObjectForTargetTimezone(TARGET_TIMEZONE_IANA), []);
  const isSameDayInTargetTimezone = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getDate() === d2.getDate();

  const formatTimeForDisplay = (utcIsoString: string) => 
    new Date(utcIsoString).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit', timeZone: TARGET_TIMEZONE_IANA});

  const dateKeyFormatter = useMemo(() => new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TARGET_TIMEZONE_IANA
  }), []);

  return (
    <div className="bg-white p-4 sm:p-6 shadow rounded-lg select-none overflow-x-auto">
      <div className="flex items-center justify-between mb-4 min-w-[700px]">
        <button onClick={() => onNavigateWeek('prev')} aria-label="Semana anterior" className="p-2 rounded-full hover:bg-slate-100 text-brand-gray hover:text-primary transition-colors"> {/* text-slate-600 to text-brand-gray */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-lg sm:text-xl font-semibold text-primary-dark text-center" aria-live="polite"> {/* text-slate-700 to text-primary-dark */}
          {weekStart.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
        </h2>
        <button onClick={() => onNavigateWeek('next')} aria-label="Semana siguiente" className="p-2 rounded-full hover:bg-slate-100 text-brand-gray hover:text-primary transition-colors"> {/* text-slate-600 to text-brand-gray */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-0 border-t border-l border-slate-200" style={{ minWidth: '750px' }}>
        <div className="py-2 px-1 text-xs text-center font-semibold bg-slate-50 border-b border-r border-slate-200 sticky left-0 z-20 text-brand-gray">Hora</div> {/* text-slate-900 to text-brand-gray */}
        
        {weekDays.map((dayInTargetZone, index) => ( // dayInTargetZone has local parts reflecting target timezone
          <div 
            key={index} 
            className={`py-2 px-1 text-xs sm:text-sm text-center font-semibold border-b border-r border-slate-200 text-brand-gray
                        ${isSameDayInTargetTimezone(dayInTargetZone, todayInTargetTimezone) 
                          ? 'bg-primary-light' // bg-cyan-50 to bg-primary-light
                          : 'bg-slate-50'
                        }`} // text-slate-900 to text-brand-gray
          >
            <div>{daysOfWeek[dayInTargetZone.getDay()]}</div>
            <div>{dayInTargetZone.getDate()}</div>
          </div>
        ))}

        {timeLabels.map((timeLabel, hourIndex) => (
          <React.Fragment key={timeLabel}>
            <div className="py-2 px-1 text-xs text-center font-semibold bg-slate-50 border-b border-r border-slate-200 h-[60px] sticky left-0 z-20 flex items-center justify-center text-brand-gray"> {/* text-slate-900 to text-brand-gray */}
              {timeLabel}
            </div>
            
            {weekDays.map((dayDateInTargetZone, dayIndex) => {
              // dayDateInTargetZone is the Date object for the current column, local parts are in target TZ context.
              const currentColumnDateKey = dateKeyFormatter.format(dayDateInTargetZone); // YYYY-MM-DD of the column in target TZ

              return (
                <div 
                  key={`${dayIndex}-${hourIndex}`} 
                  className={`border-b border-r border-slate-200 relative h-[60px]`}
                  role="gridcell"
                >
                  {hourIndex === 0 && filteredAppointments 
                      .filter(app => {
                          // Convert app's UTC start time to a Date object to format its date part in TARGET_TIMEZONE_IANA
                          const appDateKey = dateKeyFormatter.format(new Date(app.fechaHoraInicio));
                          return appDateKey === currentColumnDateKey;
                      })
                      .map(app => {
                           const style = getAppointmentPositionAndStyle(app, dayDateInTargetZone);
                           if (!style) return null;
                           
                           const statusColors = APPOINTMENT_STATUS_COLORS[app.estado];
                           const blockClasses = `p-1 rounded text-xs overflow-hidden ${statusColors?.blockBgClass || 'bg-slate-400'} ${statusColors?.blockTextClass || 'text-white'}`;

                           return (
                              <div
                                  key={`${app.id}-dayrender`} 
                                  style={style}
                                  className={`cursor-pointer hover:opacity-80 transition-opacity ${blockClasses}`}
                                  onClick={(e) => { e.stopPropagation(); onAppointmentClick && onAppointmentClick(app);}}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Turno con ${patientNameMap.get(app.pacienteId) || 'Paciente Desconocido'} de ${formatTimeForDisplay(app.fechaHoraInicio)} a ${formatTimeForDisplay(app.fechaHoraFin)}`}
                              >
                                  <p className="font-semibold truncate">{patientNameMap.get(app.pacienteId) || 'Paciente Desconocido'}</p>
                                  <p className="truncate">{formatTimeForDisplay(app.fechaHoraInicio)} - {formatTimeForDisplay(app.fechaHoraFin)}</p>
                              </div>
                          );
                      })
                  }
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
       <p className="mt-4 text-xs text-brand-gray text-center min-w-[700px]"> {/* text-slate-500 to text-brand-gray */}
        Mostrando turnos de {timeSlotsStartHour}:00 a {timeSlotsEndHour}:00 ({TARGET_TIMEZONE_IANA.replace('/','_').replace('Etc_GMT','GMT')}).
      </p>
    </div>
  );
};