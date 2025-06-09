
import React, { useState, useEffect, useCallback, useMemo, useRef, CSSProperties } from 'react';
import { useNavigate, Link } 
from 'react-router-dom'; 
import { AppointmentCalendar } from '../components/calendar/AppointmentCalendar';
import { WeeklyHourlyCalendar } from '../components/calendar/WeeklyHourlyCalendar';
import { Turno, UserRole, UserProfile } from '../types'; 
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/shared/Spinner';
import { Alert } from '../components/shared/Alert';
import { Button } from '../components/shared/Button';
import { BookingForm } from '../components/forms/BookingForm'; 
import { appointmentService } from '../services/appointmentService';
import { profileService } from '../services/profileService'; 
import { APPOINTMENT_STATUS_COLORS, USER_FRIENDLY_STATUS } from '../constants';
import { TARGET_TIMEZONE_IANA, getLocalDateObjectForTargetTimezone, formatTargetTimezoneDateTimeLocalToUTCISO, formatUTCISOToDateTimeLocalInTargetTimezone } from '../utils/timezones';

type CalendarView = 'month' | 'week';

export const AppointmentsPage = (): JSX.Element => {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate(); 
  const [appointments, setAppointments] = useState<Turno[]>([]);
  const [patients, setPatients] = useState<Pick<UserProfile, 'id' | 'nombre' | 'apellido'>[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDateForBooking, setSelectedDateForBooking] = useState<Date | null>(null);

  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(() => getLocalDateObjectForTargetTimezone(TARGET_TIMEZONE_IANA));
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date()); // True UTC "now"


  const [hoveredAppointmentInfo, setHoveredAppointmentInfo] = useState<{
    appointment: Turno;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [appointmentPopoverStyle, setAppointmentPopoverStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });
  const appointmentPopoverRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date()); 
    }, 60000); 
    return () => clearInterval(timer);
  }, []);
  

  const fetchInitialData = useCallback(async () => {
    if (user && role && profile) {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedAppointments = await appointmentService.getAppointmentsByUserId(profile.id, role);
        setAppointments(fetchedAppointments.sort((a,b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime()));

        if (role === UserRole.TERAPEUTA) {
          const fetchedPatientsResult = await profileService.getPacientes();
          setPatients(fetchedPatientsResult);
        } else {
          setPatients([]); 
        }

      } catch (err: any) {
        setError(err.message || "Error al cargar los datos de turnos o pacientes.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false); 
    }
  }, [user, role, profile]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (hoveredAppointmentInfo && appointmentPopoverRef.current) {
      const popover = appointmentPopoverRef.current;
      const popoverRect = popover.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const offset = 15; 
      const margin = 10; 

      let newLeft = hoveredAppointmentInfo.mouseX + offset;
      let newTop = hoveredAppointmentInfo.mouseY + offset;

      if (newLeft + popoverRect.width + margin > viewportWidth) {
        newLeft = hoveredAppointmentInfo.mouseX - popoverRect.width - offset; 
      }
      if (newLeft < margin) newLeft = margin;
      if (newLeft + popoverRect.width + margin > viewportWidth) newLeft = viewportWidth - popoverRect.width - margin;
      
      if (newTop + popoverRect.height + margin > viewportHeight) newTop = hoveredAppointmentInfo.mouseY - popoverRect.height - offset;
      if (newTop < margin) newTop = margin;
      if (newTop + popoverRect.height + margin > viewportHeight) newTop = viewportHeight - popoverRect.height - margin;

      setAppointmentPopoverStyle({
        position: 'fixed',
        top: `${Math.max(margin, newTop)}px`,
        left: `${Math.max(margin, newLeft)}px`,
        minWidth: '180px',
        visibility: 'visible',
        zIndex: 50, 
      });
    } else {
      setAppointmentPopoverStyle({ visibility: 'hidden' });
    }
  }, [hoveredAppointmentInfo]);


  const handleDateClickForMonthlyView = (date: Date) => {
    setSelectedDateForBooking(date);
  };
  
  const handleAppointmentClick = (appointment: Turno) => {
    navigate(`/turnos/${appointment.id}`);
  };


  const handleAppointmentsBooked = (newlyBookedAppointments: Turno[]) => {
    setAppointments(prev => 
        [...prev, ...newlyBookedAppointments].sort((a,b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime())
    );
    setShowBookingModal(false);
    setSelectedDateForBooking(null);
  };

  const handleOpenBookingModal = () => {
    const dateForBooking = selectedDateForBooking || getLocalDateObjectForTargetTimezone(TARGET_TIMEZONE_IANA);
    const year = dateForBooking.getFullYear();
    const month = (dateForBooking.getMonth() + 1).toString().padStart(2, '0');
    const day = dateForBooking.getDate().toString().padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    
    setValueForBookingForm(localDateString);
    setShowBookingModal(true);
  }

  const [valueForBookingForm, setValueForBookingForm] = useState<string>(() => {
    const todayInTargetZone = getLocalDateObjectForTargetTimezone(TARGET_TIMEZONE_IANA);
    return `${todayInTargetZone.getFullYear()}-${(todayInTargetZone.getMonth() + 1).toString().padStart(2, '0')}-${todayInTargetZone.getDate().toString().padStart(2, '0')}`;
  });


  const handleNavigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + (direction === 'prev' ? -7 : 7));
      return newDate;
    });
  };

  const formatTime = useCallback((isoString: string) => {
    const formatted = new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: TARGET_TIMEZONE_IANA });
    return formatted;
  }, []);

  const formatDateTimeFull = useCallback((isoString: string) => {
    const formatted = new Date(isoString).toLocaleString('es-ES', { dateStyle:'medium', timeStyle:'short', timeZone: TARGET_TIMEZONE_IANA });
    return formatted;
  }, []);

  const { todaysAppointments, historicalAppointments, currentAppointmentId } = useMemo(() => {
    const nowUTC = currentDateTime; // currentDateTime is true UTC "now"

    // Get today's date components in TARGET_TIMEZONE_IANA from the true UTC 'now'
    const todayInTarget = getLocalDateObjectForTargetTimezone(TARGET_TIMEZONE_IANA);
    const y = todayInTarget.getFullYear();
    const mo = (todayInTarget.getMonth() + 1).toString().padStart(2, '0');
    const d = todayInTarget.getDate().toString().padStart(2, '0');

    // These are "wall clock" time strings for the start/end of "today" in TARGET_TIMEZONE_IANA
    const startOfTodayLocalStr = `${y}-${mo}-${d}T00:00:00`;
    const endOfTodayLocalStr = `${y}-${mo}-${d}T23:59:59`;

    // Convert these local time strings (interpreted as TARGET_TIMEZONE_IANA) to their UTC Date objects for comparison
    // formatTargetTimezoneDateTimeLocalToUTCISO now returns a local string YYYY-MM-DDTHH:MM:SS
    // To compare against UTC appointment times, we need to convert these local boundary strings to *actual* UTC.
    // This requires knowing the offset. A simpler way is to compare appointment's local time string.
    
    // Simpler approach for filtering: Convert appointment's UTC time to local date string in TARGET_TIMEZONE_IANA
    // and compare with today's date string in TARGET_TIMEZONE_IANA.
    const todayDateStringInTarget = `${y}-${mo}-${d}`;

    const filteredTodaysAppointments = appointments
      .filter(app => {
        // Convert app's UTC start time to a local date string in TARGET_TIMEZONE_IANA
        const appLocalDateString = formatUTCISOToDateTimeLocalInTargetTimezone(app.fechaHoraInicio, TARGET_TIMEZONE_IANA).substring(0, 10); // YYYY-MM-DD part
        return appLocalDateString === todayDateStringInTarget;
      })
      .sort((a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime());

    let currentAppId: string | null = null;
    for (const app of filteredTodaysAppointments) {
      const appStartUTC = new Date(app.fechaHoraInicio);
      const appEndUTC = new Date(app.fechaHoraFin);
      if (nowUTC >= appStartUTC && nowUTC <= appEndUTC) {
        currentAppId = app.id;
        break;
      }
    }
    
    // For historical, compare appointment's local date part with today's local date part
    const filteredHistoricalAppointments = appointments
      .filter(app => {
        const appLocalDateString = formatUTCISOToDateTimeLocalInTargetTimezone(app.fechaHoraInicio, TARGET_TIMEZONE_IANA).substring(0, 10);
        return appLocalDateString < todayDateStringInTarget;
      })
      .sort((a, b) => new Date(b.fechaHoraInicio).getTime() - new Date(a.fechaHoraInicio).getTime()); 

    return { 
      todaysAppointments: filteredTodaysAppointments, 
      historicalAppointments: filteredHistoricalAppointments,
      currentAppointmentId: currentAppId,
    };
  }, [appointments, currentDateTime, formatTime, formatDateTimeFull]);
  

  const handleAppointmentCardMouseEnter = (appointment: Turno, event: React.MouseEvent<HTMLDivElement>) => {
    setHoveredAppointmentInfo({
      appointment,
      mouseX: event.clientX,
      mouseY: event.clientY,
    });
  };

  const handleAppointmentCardMouseLeave = () => { /* Popover handles its own leave */ };
  const handleAppointmentPopoverMouseEnter = () => { if (hoveredAppointmentInfo) setHoveredAppointmentInfo(prev => prev ? { ...prev } : null); };
  const handleAppointmentPopoverMouseLeave = () => setHoveredAppointmentInfo(null);


  if (!user || !role || !profile) { 
     return (
      <div className="flex items-center justify-center py-10">
        <Alert type="warning" message="Debe estar autenticado, tener un perfil y un rol asignado para ver los turnos." />
      </div>
    );
  }

  if (isLoading && appointments.length === 0 && !error) { 
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error) {
    return <Alert type="error" message={error} />;
  }
  
  const appointmentsForBookingForm = role === UserRole.TERAPEUTA ? appointments : [];


  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 shadow rounded-lg">
        <h2 className="text-xl font-semibold text-primary mb-4">Turnos de Hoy</h2> {/* text-slate-700 to text-primary */}
        {isLoading && todaysAppointments.length === 0 && (
            <div className="flex justify-center items-center h-24"> <Spinner/> </div>
        )}
        {!isLoading && todaysAppointments.length === 0 && (
          <p className="text-brand-gray">No hay turnos programados para hoy.</p> 
        )}
        {todaysAppointments.length > 0 && (
          <div className="flex space-x-3 overflow-x-auto py-2 pr-2">
            {todaysAppointments.map(app => {
              const isCurrent = app.id === currentAppointmentId;
              const statusColors = APPOINTMENT_STATUS_COLORS[app.estado];
              
              let cardClasses = `flex-shrink-0 w-48 h-28 p-3 text-sm flex flex-col justify-between cursor-pointer transition-shadow hover:shadow-md ${statusColors?.blockBgClass || 'bg-slate-400'} ${statusColors?.blockTextClass || 'text-white'}`;
              
              if (isCurrent) cardClasses += ` ring-4 ring-primary-dark ring-offset-2 ring-offset-white animate-pulse`; // Primary-dark for current appointment ring

              return (
                <div
                  key={app.id}
                  className={cardClasses}
                  onClick={() => handleAppointmentClick(app)}
                  onMouseEnter={(e) => handleAppointmentCardMouseEnter(app, e)}
                  onMouseLeave={handleAppointmentCardMouseLeave}
                  role="button"
                  tabIndex={0}
                  aria-label={`${USER_FRIENDLY_STATUS[app.estado]} - ${formatTime(app.fechaHoraInicio)} a ${formatTime(app.fechaHoraFin)} ${role === UserRole.TERAPEUTA ? 'con ' + (patients.find(p=>p.id === app.pacienteId)?.nombre || 'Paciente') : ''}`}
                >
                  <div>
                    <p className="font-bold truncate">{formatTime(app.fechaHoraInicio)} - {formatTime(app.fechaHoraFin)}</p>
                    <p className="mt-1 truncate">
                      {role === UserRole.TERAPEUTA 
                        ? (patients.find(p=>p.id === app.pacienteId)?.nombre || 'Paciente')
                        : "Mi Turno"}
                    </p>
                  </div>
                  <p className="text-xs font-medium self-start px-1.5 py-0.5 rounded-full" 
                     style={{ backgroundColor: statusColors?.bgClass ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }} // Consider using Tailwind bg opacity for consistency
                  >
                    {USER_FRIENDLY_STATUS[app.estado]}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-semibold text-primary-dark">Mis Turnos</h1> {/* text-slate-800 to text-primary-dark */}
        <div className="flex items-center gap-2">
          <Button 
            variant={calendarView === 'month' ? 'primary' : 'outline'} 
            onClick={() => setCalendarView('month')}
            size="sm"
          >
            Mes
          </Button>
          <Button 
            variant={calendarView === 'week' ? 'primary' : 'outline'} 
            onClick={() => setCalendarView('week')}
            size="sm"
          >
            Semana
          </Button>
          {role === UserRole.TERAPEUTA && (
              <Button onClick={handleOpenBookingModal} variant="primary" size="sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Agendar
              </Button>
          )}
        </div>
      </div>
      
      {calendarView === 'month' ? (
        <AppointmentCalendar 
          appointments={appointments} 
          onDateClick={handleDateClickForMonthlyView}
          onEventClick={(appId) => { 
            const app = appointments.find(a => a.id === appId);
            if (app) handleAppointmentClick(app);
          }}
          highlightedDate={selectedDateForBooking}
          patients={patients}
          currentUserRole={role}
          currentUserProfileId={profile?.id}
        />
      ) : (
        <WeeklyHourlyCalendar
          currentDate={currentWeekDate} 
          appointments={appointments}
          patients={patients}
          onNavigateWeek={handleNavigateWeek}
          onAppointmentClick={handleAppointmentClick} 
        />
      )}

      <div className="bg-white p-4 sm:p-6 shadow rounded-lg">
          <h2 className="text-xl font-semibold text-primary mb-3">Historial de Turnos ({historicalAppointments.length})</h2> {/* text-slate-700 to text-primary */}
          {isLoading && historicalAppointments.length === 0 && appointments.length > 0 && <Spinner />} 
          {!isLoading && historicalAppointments.length > 0 ? (
            <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {historicalAppointments.map(app => (
                <li key={app.id} className="p-3 border rounded-md hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => handleAppointmentClick(app)}>
                   {role === UserRole.TERAPEUTA && (
                    <p className="font-medium text-brand-gray"> {/* text-slate-700 to text-brand-gray */}
                      Paciente: {patients.find(p=>p.id === app.pacienteId)?.nombre || 'Desconocido'} {patients.find(p=>p.id === app.pacienteId)?.apellido || ''}
                    </p>
                  )}
                  {role === UserRole.PACIENTE && app.pacienteId === profile?.id && (
                    <p className="font-medium text-brand-gray"> {/* text-slate-700 to text-brand-gray */}
                      Turno Pasado
                    </p>
                  )}
                  <p className="text-sm text-brand-gray"> {/* text-slate-600 to text-brand-gray */}
                    Fecha: {formatDateTimeFull(app.fechaHoraInicio)}
                  </p>
                   <p className="text-sm text-brand-gray capitalize">Estado:{" "} {/* text-slate-500 to text-brand-gray */}
                    <span 
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        APPOINTMENT_STATUS_COLORS[app.estado]?.bgClass || 'bg-slate-200'
                      } ${
                        APPOINTMENT_STATUS_COLORS[app.estado]?.textClass || 'text-brand-gray' // text-slate-700 to text-brand-gray
                      }`}
                    >
                      {USER_FRIENDLY_STATUS[app.estado] || app.estado}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            !isLoading && <p className="text-brand-gray">No hay turnos en el historial.</p> /* text-slate-500 to text-brand-gray */
          )}
        </div>


      {showBookingModal && role === UserRole.TERAPEUTA && user && profile && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out" 
            onClick={(e) => { if(e.target === e.currentTarget) setShowBookingModal(false);}}
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="booking-modal-title"
        >
          <BookingForm 
            therapistId={profile.id}
            existingAppointments={appointmentsForBookingForm} 
            onBookAppointments={handleAppointmentsBooked}
            onClose={() => { setShowBookingModal(false); setSelectedDateForBooking(null); }}
            initialDate={valueForBookingForm} 
          />
        </div>
      )}

      {hoveredAppointmentInfo && hoveredAppointmentInfo.appointment && (
        <div
          ref={appointmentPopoverRef}
          className="bg-white shadow-xl rounded-lg p-3 border border-slate-200 max-w-xs text-xs"
          style={appointmentPopoverStyle}
          onMouseEnter={handleAppointmentPopoverMouseEnter}
          onMouseLeave={handleAppointmentPopoverMouseLeave}
        >
          <h4 className="font-semibold text-primary-dark mb-2 border-b pb-1"> {/* text-slate-700 to text-primary-dark */}
            Detalles del Turno
          </h4>
          <div
            className="p-1.5 rounded hover:bg-slate-100 cursor-pointer"
            onClick={() => {
                if (hoveredAppointmentInfo && hoveredAppointmentInfo.appointment) {
                    handleAppointmentClick(hoveredAppointmentInfo.appointment);
                }
                setHoveredAppointmentInfo(null);
            }}
          >
            <p className="font-medium text-primary-dark">
              {formatTime(hoveredAppointmentInfo.appointment.fechaHoraInicio)} - {formatTime(hoveredAppointmentInfo.appointment.fechaHoraFin)}
            </p>
            <p className="text-brand-gray"> {/* text-slate-600 to text-brand-gray */}
              {role === UserRole.TERAPEUTA
                ? (patients.find(p => p.id === hoveredAppointmentInfo.appointment.pacienteId)?.nombre || `ID Paciente: ${hoveredAppointmentInfo.appointment.pacienteId.substring(0,6)}...`)
                : role === UserRole.PACIENTE && hoveredAppointmentInfo.appointment.pacienteId === profile?.id
                  ? "Mi Turno"
                  : "Turno"}
              <span className={`text-xs ml-1 font-medium ${APPOINTMENT_STATUS_COLORS[hoveredAppointmentInfo.appointment.estado]?.textClass || 'text-brand-gray'}`}> {/* text-slate-500 to text-brand-gray */}
                ({USER_FRIENDLY_STATUS[hoveredAppointmentInfo.appointment.estado] || hoveredAppointmentInfo.appointment.estado})
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
