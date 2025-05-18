import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS } from '../utils/theme';
import { IS_TABLET, scaledFontSize, getStatusBarHeight } from '../utils/responsive';
import { format, addMonths, subMonths, addDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { useUser } from '../context/UserContext';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarScreen = ({ navigation }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const { isLoggedIn } = useUser();

  // Ensure user is logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [isLoggedIn, navigation]);

  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const generateCalendarDays = () => {
    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
    const firstDayOfWeek = getDay(firstDayOfMonth); // 0 = Sunday, 1 = Monday, etc.

    const calendarDays = [];

    // Add empty spaces for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push(null);
    }

    // Add all days of the month
    daysInMonth.forEach(day => {
      calendarDays.push(day);
    });

    return calendarDays;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelectedDate = (date) => {
    if (!date || !selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const renderCalendar = () => {
    const calendarDays = generateCalendarDays();
    const weeks = [];
    const daysPerWeek = 7;

    // Split days into weeks
    for (let i = 0; i < calendarDays.length; i += daysPerWeek) {
      weeks.push(calendarDays.slice(i, i + daysPerWeek));
    }

    return (
      <View style={styles.calendarContainer}>
        {/* Calendar header with month/year and navigation arrows */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Days of week */}
        <View style={styles.weekHeaderRow}>
          {DAYS_OF_WEEK.map((day, index) => (
            <View key={`weekday-${index}`} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRow}>
              {week.map((day, dayIndex) => (
                <TouchableOpacity
                  key={`day-${weekIndex}-${dayIndex}`}
                  style={[
                    styles.dayCell,
                    isToday(day) && styles.todayCell,
                    isSelectedDate(day) && styles.selectedCell,
                    !day && styles.emptyCell,
                  ]}
                  onPress={() => day && handleDateSelect(day)}
                  disabled={!day}
                >
                  {day ? (
                    <Text
                      style={[
                        styles.dayText,
                        isToday(day) && styles.todayText,
                        isSelectedDate(day) && styles.selectedDayText,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading calendar...</Text>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            {renderCalendar()}
            
            {/* Selected Date Display */}
            <View style={styles.selectedDateContainer}>
              <Text style={styles.selectedDateTitle}>Selected Date</Text>
              <Text style={styles.selectedDateText}>{format(selectedDate, 'EEEE, MMMM dd, yyyy')}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: getStatusBarHeight() + 10,
    paddingBottom: 12,
    backgroundColor: COLORS.secondary,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.secondaryDark,
  },
  headerTitle: {
    fontSize: scaledFontSize(18),
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 18,
  },
  contentContainer: {
    paddingVertical: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: scaledFontSize(16),
    color: COLORS.textMedium,
  },
  calendarContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.light,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.secondaryLight,
  },
  monthTitle: {
    fontSize: scaledFontSize(18),
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: scaledFontSize(14),
    fontWeight: '600',
    color: COLORS.primary,
  },
  calendarGrid: {
    justifyContent: 'flex-start',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 2,
  },
  dayText: {
    fontSize: scaledFontSize(14),
    color: COLORS.textDark,
  },
  todayCell: {
    backgroundColor: COLORS.primaryLight + '40', // 40% opacity
  },
  todayText: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  selectedCell: {
    backgroundColor: COLORS.primary,
  },
  selectedDayText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  emptyCell: {
    backgroundColor: 'transparent',
  },
  selectedDateContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    ...SHADOWS.light,
  },
  selectedDateTitle: {
    fontSize: scaledFontSize(16),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  selectedDateText: {
    fontSize: scaledFontSize(16),
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default CalendarScreen; 