# Calendar & History System

> Time-based views and navigation for exploring gratitude journey over time.

## 📅 Overview

The Calendar & History system provides users with visual and intuitive ways to:

- **Calendar Navigation** - Visual timeline of gratitude entries with date-based browsing
- **Entry History** - Chronological list view of past gratitude entries
- **Data Visualization** - Visual indicators for entry density, streaks, and patterns
- **Quick Access** - Jump to any date and view or edit historical entries
- **Pattern Recognition** - Identify trends and habits in gratitude practice

## 🏗 Data Architecture

### Calendar Data Structures

```typescript
// Calendar view data interfaces
interface CalendarEntry {
  date: string; // YYYY-MM-DD format
  hasEntry: boolean;
  statementCount: number;
  isGoalComplete: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0-6, Sunday = 0
}

interface CalendarMonth {
  year: number;
  month: number; // 1-12
  entries: CalendarEntry[];
  totalEntries: number;
  completedDays: number;
  streakDays: number[];
}

interface CalendarStats {
  totalDays: number;
  activeDays: number;
  completionRate: number;
  currentStreak: number;
  monthlyAverage: number;
}
```

### Database Queries

```sql
-- Get entry dates for calendar month view
CREATE OR REPLACE FUNCTION get_entry_dates_for_month(
    p_user_id UUID,
    p_year INTEGER,
    p_month INTEGER
) RETURNS TABLE(entry_date DATE, statement_count INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ge.entry_date,
        jsonb_array_length(ge.statements) as statement_count
    FROM public.gratitude_entries ge
    WHERE
        ge.user_id = p_user_id
        AND EXTRACT(YEAR FROM ge.entry_date) = p_year
        AND EXTRACT(MONTH FROM ge.entry_date) = p_month
    ORDER BY ge.entry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get calendar statistics for a date range
CREATE OR REPLACE FUNCTION get_calendar_stats(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE(
    total_days INTEGER,
    active_days INTEGER,
    total_statements INTEGER,
    avg_statements_per_day NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (p_end_date - p_start_date + 1)::INTEGER as total_days,
        COUNT(DISTINCT ge.entry_date)::INTEGER as active_days,
        SUM(jsonb_array_length(ge.statements))::INTEGER as total_statements,
        ROUND(AVG(jsonb_array_length(ge.statements)), 2) as avg_statements_per_day
    FROM public.gratitude_entries ge
    WHERE
        ge.user_id = p_user_id
        AND ge.entry_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 📅 Calendar Component Architecture

### Main Calendar View

```typescript
// Enhanced calendar component with gratitude data integration
interface CalendarViewProps {
  onDateSelect: (date: string) => void;
  selectedDate?: string;
  highlightToday?: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = React.memo(({
  onDateSelect,
  selectedDate,
  highlightToday = true,
}) => {
  const { theme } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { profile } = useUserProfile();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Fetch entry dates for current month
  const { data: entryDates, isLoading } = useQuery({
    queryKey: queryKeys.gratitude.calendar(year, month),
    queryFn: () => gratitudeApi.getEntryDatesForMonth(year, month),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate calendar data
  const calendarData = useMemo(() => {
    return generateCalendarData(year, month, entryDates || [], profile?.daily_gratitude_goal || 3);
  }, [year, month, entryDates, profile?.daily_gratitude_goal]);

  const handleDatePress = useCallback((date: string) => {
    onDateSelect(date);
    hapticFeedback.light();

    // Analytics tracking
    analyticsService.logEvent('calendar_date_selected', {
      selected_date: date,
      has_entry: entryDates?.includes(date) || false,
      is_today: date === new Date().toISOString().split('T')[0],
    });
  }, [onDateSelect, entryDates]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  }, []);

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  return (
    <View style={styles.container}>
      <CalendarHeader
        date={currentDate}
        onPrevMonth={() => navigateMonth('prev')}
        onNextMonth={() => navigateMonth('next')}
        stats={calendarData.stats}
      />

      <CalendarGrid
        calendarData={calendarData}
        selectedDate={selectedDate}
        onDatePress={handleDatePress}
        highlightToday={highlightToday}
      />

      <CalendarLegend />
    </View>
  );
});

// Calendar data generation
const generateCalendarData = (
  year: number,
  month: number,
  entryDates: string[],
  dailyGoal: number
): CalendarMonth => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const entries: CalendarEntry[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Generate entries for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateString = date.toISOString().split('T')[0];
    const entryData = entryDates.find(entry => entry.includes(dateString));
    const statementCount = entryData ? parseInt(entryData.split('|')[1]) || 0 : 0;

    entries.push({
      date: dateString,
      hasEntry: !!entryData,
      statementCount,
      isGoalComplete: statementCount >= dailyGoal,
      isToday: dateString === today,
      dayOfWeek: date.getDay(),
    });
  }

  // Calculate statistics
  const totalEntries = entries.filter(entry => entry.hasEntry).length;
  const completedDays = entries.filter(entry => entry.isGoalComplete).length;

  return {
    year,
    month,
    entries,
    totalEntries,
    completedDays,
    streakDays: calculateMonthlyStreakDays(entries),
  };
};
```

### Calendar Day Component

```typescript
// Individual calendar day with visual indicators
interface CalendarDayProps {
  entry: CalendarEntry;
  isSelected: boolean;
  onPress: (date: string) => void;
  size: number;
}

const CalendarDay: React.FC<CalendarDayProps> = React.memo(({
  entry,
  isSelected,
  onPress,
  size,
}) => {
  const { theme } = useTheme();
  const day = parseInt(entry.date.split('-')[2]);

  const dayStyle = useMemo(() => {
    const baseStyle = {
      width: size,
      height: size,
      borderRadius: size / 2,
      justifyContent: 'center',
      alignItems: 'center',
      margin: 2,
    };

    // State-based styling
    if (entry.isToday) {
      return {
        ...baseStyle,
        backgroundColor: theme.colors.primary,
        borderWidth: 2,
        borderColor: theme.colors.onPrimary,
      };
    }

    if (isSelected) {
      return {
        ...baseStyle,
        backgroundColor: theme.colors.primaryContainer,
        borderWidth: 2,
        borderColor: theme.colors.primary,
      };
    }

    if (entry.isGoalComplete) {
      return {
        ...baseStyle,
        backgroundColor: theme.colors.successContainer,
        borderWidth: 1,
        borderColor: theme.colors.success,
      };
    }

    if (entry.hasEntry) {
      return {
        ...baseStyle,
        backgroundColor: theme.colors.secondaryContainer,
        borderWidth: 1,
        borderColor: theme.colors.secondary,
      };
    }

    return {
      ...baseStyle,
      backgroundColor: 'transparent',
    };
  }, [entry, isSelected, theme, size]);

  const textStyle = useMemo(() => {
    const baseTextStyle = {
      fontSize: size * 0.35,
      fontWeight: '600' as const,
    };

    if (entry.isToday || isSelected) {
      return { ...baseTextStyle, color: theme.colors.onPrimary };
    }

    if (entry.isGoalComplete || entry.hasEntry) {
      return { ...baseTextStyle, color: theme.colors.onSecondaryContainer };
    }

    return { ...baseTextStyle, color: theme.colors.onSurface };
  }, [entry, isSelected, theme, size]);

  return (
    <TouchableOpacity
      style={dayStyle}
      onPress={() => onPress(entry.date)}
      accessibilityRole="button"
      accessibilityLabel={`${day} ${getMonthName(entry.date)} ${entry.hasEntry ? 'minnet kaydı var' : 'kayıt yok'}`}
    >
      <Text style={textStyle}>{day}</Text>

      {/* Statement count indicator */}
      {entry.statementCount > 0 && (
        <View style={styles.statementIndicator}>
          <Text style={styles.statementCount}>
            {entry.statementCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});
```

### Calendar Statistics

```typescript
// Calendar statistics component
interface CalendarStatsProps {
  stats: CalendarStats;
  period: 'month' | 'year';
}

const CalendarStats: React.FC<CalendarStatsProps> = React.memo(({
  stats,
  period
}) => {
  const { theme } = useTheme();

  const completionPercentage = (stats.activeDays / stats.totalDays) * 100;

  return (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>
        {period === 'month' ? 'Bu Ay' : 'Bu Yıl'}
      </Text>

      <View style={styles.statsGrid}>
        <StatItem
          icon="calendar-check"
          value={stats.activeDays}
          total={stats.totalDays}
          label="Aktif Gün"
          color={theme.colors.primary}
        />

        <StatItem
          icon="target"
          value={`${Math.round(completionPercentage)}%`}
          label="Tamamlama"
          color={theme.colors.success}
        />

        <StatItem
          icon="fire"
          value={stats.currentStreak}
          label="Mevcut Seri"
          color="#FF6B35"
        />

        <StatItem
          icon="trending-up"
          value={stats.monthlyAverage.toFixed(1)}
          label="Günlük Ort."
          color={theme.colors.secondary}
        />
      </View>
    </View>
  );
});

const StatItem: React.FC<{
  icon: string;
  value: string | number;
  total?: number;
  label: string;
  color: string;
}> = ({ icon, value, total, label, color }) => (
  <View style={styles.statItem}>
    <Icon name={icon} size={20} color={color} />
    <Text style={styles.statValue}>
      {value}{total && `/${total}`}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);
```

## 📜 History List View

### Past Entries List

```typescript
// Paginated history list with infinite scroll
interface PastEntriesListProps {
  onEntryPress: (entry: GratitudeEntry) => void;
  searchQuery?: string;
  filterDate?: string;
}

const PastEntriesList: React.FC<PastEntriesListProps> = React.memo(({
  onEntryPress,
  searchQuery,
  filterDate,
}) => {
  const { theme } = useTheme();

  // Infinite query for paginated loading
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: queryKeys.gratitude.entriesPaginated(searchQuery, filterDate),
    queryFn: ({ pageParam = 0 }) =>
      gratitudeApi.getGratitudeDailyEntriesPaginated(pageParam, 20),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.currentPage + 1 : undefined,
    staleTime: 5 * 60 * 1000,
  });

  const entries = useMemo(() => {
    return data?.pages.flatMap(page => page.entries) || [];
  }, [data]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery && !filterDate) return entries;

    return entries.filter(entry => {
      // Date filter
      if (filterDate && entry.entry_date !== filterDate) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return entry.statements.some(statement =>
          statement.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [entries, searchQuery, filterDate]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderEntry = useCallback(({ item: entry }: { item: GratitudeEntry }) => (
    <PastEntryItem
      entry={entry}
      onPress={() => onEntryPress(entry)}
    />
  ), [onEntryPress]);

  const renderFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return <LoadingIndicator />;
    }
    if (!hasNextPage && entries.length > 0) {
      return (
        <View style={styles.endMessage}>
          <Text style={styles.endMessageText}>
            Tüm kayıtları görüntüledin 🎉
          </Text>
        </View>
      );
    }
    return null;
  }, [isFetchingNextPage, hasNextPage, entries.length]);

  if (isLoading) {
    return <PastEntriesSkeletonLoader />;
  }

  if (isError) {
    return <PastEntriesErrorState error={error} />;
  }

  if (filteredEntries.length === 0) {
    return <PastEntriesEmptyState searchQuery={searchQuery} />;
  }

  return (
    <FlatList
      data={filteredEntries}
      renderItem={renderEntry}
      keyExtractor={(entry) => entry.id}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
    />
  );
});
```

### Entry Item Component

```typescript
// Individual past entry display
interface PastEntryItemProps {
  entry: GratitudeEntry;
  onPress: () => void;
}

const PastEntryItem: React.FC<PastEntryItemProps> = React.memo(({
  entry,
  onPress,
}) => {
  const { theme } = useTheme();
  const entryDate = new Date(entry.entry_date);

  const formattedDate = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(entryDate, today)) {
      return 'Bugün';
    } else if (isSameDay(entryDate, yesterday)) {
      return 'Dün';
    } else {
      return formatDate(entryDate, 'dd MMMM yyyy', { locale: tr });
    }
  }, [entryDate]);

  const previewText = useMemo(() => {
    if (entry.statements.length === 0) return '';
    if (entry.statements.length === 1) {
      return entry.statements[0];
    }
    return `${entry.statements[0]} ve ${entry.statements.length - 1} tane daha...`;
  }, [entry.statements]);

  return (
    <TouchableOpacity
      style={styles.entryItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${formattedDate} tarihli minnet kaydı, ${entry.statements.length} ifade`}
    >
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{formattedDate}</Text>
        <View style={styles.entryBadge}>
          <Icon name="heart" size={12} color={theme.colors.primary} />
          <Text style={styles.entryCount}>{entry.statements.length}</Text>
        </View>
      </View>

      <Text style={styles.entryPreview} numberOfLines={2}>
        {previewText}
      </Text>

      <View style={styles.entryFooter}>
        <Text style={styles.entryTime}>
          {formatDate(new Date(entry.created_at), 'HH:mm')}
        </Text>
        <Icon name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} />
      </View>
    </TouchableOpacity>
  );
});
```

## 🔍 Search & Filter System

### Advanced Search

```typescript
// Search and filter interface
interface SearchFiltersProps {
  onSearchChange: (query: string) => void;
  onDateFilterChange: (date: string | null) => void;
  onSortChange: (sort: 'newest' | 'oldest' | 'most_statements') => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = React.memo(({
  onSearchChange,
  onDateFilterChange,
  onSortChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_statements'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearchChange(query);
    }, 300),
    [onSearchChange]
  );

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  }, [debouncedSearch]);

  const handleDateFilter = useCallback((date: string | null) => {
    setSelectedDate(date);
    onDateFilterChange(date);
  }, [onDateFilterChange]);

  const handleSortChange = useCallback((sort: typeof sortBy) => {
    setSortBy(sort);
    onSortChange(sort);
  }, [onSortChange]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedDate(null);
    setSortBy('newest');
    onSearchChange('');
    onDateFilterChange(null);
    onSortChange('newest');
  }, [onSearchChange, onDateFilterChange, onSortChange]);

  return (
    <View style={styles.searchContainer}>
      {/* Search input */}
      <View style={styles.searchInputContainer}>
        <Icon name="magnify" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Minnet ifadelerinde ara..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
            <Icon name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter toggle */}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Icon name="filter-variant" size={20} />
        {(selectedDate || sortBy !== 'newest') && (
          <View style={styles.filterIndicator} />
        )}
      </TouchableOpacity>

      {/* Expandable filters */}
      {showFilters && (
        <View style={styles.filtersExpanded}>
          <DateRangePicker
            selectedDate={selectedDate}
            onDateSelect={handleDateFilter}
          />

          <SortOptions
            selectedSort={sortBy}
            onSortSelect={handleSortChange}
          />

          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Filtreleri Temizle</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});
```

## 📊 Data Visualization

### Trends & Patterns

```typescript
// Historical trends visualization
interface TrendsVisualizationProps {
  timeframe: 'week' | 'month' | 'year';
}

const TrendsVisualization: React.FC<TrendsVisualizationProps> = React.memo(({
  timeframe,
}) => {
  const { data: trendsData } = useQuery({
    queryKey: queryKeys.gratitude.trends(timeframe),
    queryFn: () => analyticsApi.getGratitudeTrends(timeframe),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const chartData = useMemo(() => {
    if (!trendsData) return null;

    return {
      labels: trendsData.map(point => formatPeriodLabel(point.period, timeframe)),
      datasets: [
        {
          data: trendsData.map(point => point.entryCount),
          color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
          label: 'Minnet Girişleri',
        },
        {
          data: trendsData.map(point => point.avgStatements),
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          label: 'Ortalama İfade',
        },
      ],
    };
  }, [trendsData, timeframe]);

  if (!chartData) {
    return <LoadingSkeleton height={200} />;
  }

  return (
    <View style={styles.trendsContainer}>
      <Text style={styles.trendsTitle}>
        {timeframe === 'week' ? 'Haftalık' :
         timeframe === 'month' ? 'Aylık' : 'Yıllık'} Eğilimler
      </Text>

      <LineChart
        data={chartData}
        width={Dimensions.get('window').width - 32}
        height={200}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: { borderRadius: 16 },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
          },
        }}
        bezier
        style={styles.chart}
      />

      <TrendsInsights data={trendsData} timeframe={timeframe} />
    </View>
  );
});

// Insights from trends data
const TrendsInsights: React.FC<{
  data: TrendsDataPoint[];
  timeframe: string;
}> = ({ data, timeframe }) => {
  const insights = useMemo(() => {
    if (!data.length) return [];

    const totalEntries = data.reduce((sum, point) => sum + point.entryCount, 0);
    const avgEntries = totalEntries / data.length;
    const bestPeriod = data.reduce((best, current) =>
      current.entryCount > best.entryCount ? current : best
    );

    return [
      {
        icon: 'chart-line',
        text: `${timeframe} boyunca ortalama ${avgEntries.toFixed(1)} giriş`,
        color: '#4CAF50',
      },
      {
        icon: 'trophy',
        text: `En aktif ${formatPeriodLabel(bestPeriod.period, timeframe)}: ${bestPeriod.entryCount} giriş`,
        color: '#FF9800',
      },
    ];
  }, [data, timeframe]);

  return (
    <View style={styles.insightsContainer}>
      {insights.map((insight, index) => (
        <View key={index} style={styles.insightItem}>
          <Icon name={insight.icon} size={16} color={insight.color} />
          <Text style={styles.insightText}>{insight.text}</Text>
        </View>
      ))}
    </View>
  );
};
```

## 🎨 Visual Enhancements

### Calendar Theming

```typescript
// Calendar theme customization
const createCalendarTheme = (appTheme: AppTheme) => ({
  backgroundColor: appTheme.colors.background,
  calendarBackground: appTheme.colors.surface,
  textSectionTitleColor: appTheme.colors.onSurface,
  selectedDayBackgroundColor: appTheme.colors.primary,
  selectedDayTextColor: appTheme.colors.onPrimary,
  todayTextColor: appTheme.colors.primary,
  dayTextColor: appTheme.colors.onSurface,
  textDisabledColor: appTheme.colors.onSurfaceVariant,
  dotColor: appTheme.colors.secondary,
  selectedDotColor: appTheme.colors.onPrimary,
  arrowColor: appTheme.colors.primary,
  monthTextColor: appTheme.colors.onSurface,
  indicatorColor: appTheme.colors.primary,
  textDayFontFamily: appTheme.typography.bodyMedium.fontFamily,
  textMonthFontFamily: appTheme.typography.titleMedium.fontFamily,
  textDayHeaderFontFamily: appTheme.typography.labelMedium.fontFamily,
  textDayFontSize: 16,
  textMonthFontSize: 18,
  textDayHeaderFontSize: 14,
});

// Accessibility improvements
const calendarAccessibilityProps = {
  accessibilityRole: 'grid' as const,
  accessibilityLabel: 'Minnet takvimi',
  accessibilityHint: 'Tarih seçmek için bir güne dokunun',
};
```

This comprehensive calendar and history system provides users with multiple ways to explore their gratitude journey, identify patterns, and easily access past entries for reflection and editing.
