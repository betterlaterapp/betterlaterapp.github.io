/**
 * GoalVisualizationModule
 * Handles progress bar visualization, milestone markers, and day/week navigation
 * for behavioral goals.
 */
var GoalVisualizationModule = (function() {

    /**
     * Generate milestone marker HTML for progress bar.
     * Markers show at their proportional position on the timeline.
     */
    function generateMilestoneMarkers(milestones, goalStartMs, goalEndMs) {
        if (!milestones || milestones.length === 0) return '';

        var totalDuration = goalEndMs - goalStartMs;
        var html = '';

        for (var i = 0; i < milestones.length; i++) {
            var m = milestones[i];
            var position = ((m.timestamp - goalStartMs) / totalDuration) * 100;
            position = Math.min(100, Math.max(0, position));

            var markerClass = 'milestone-marker';
            if (m.isCompleted || m.status === 'completed') markerClass += ' completed';
            if (m.isMissed || m.status === 'missed') markerClass += ' missed';
            if (m.status === 'upcoming') markerClass += ' upcoming';

            html += '<div class="' + markerClass + '" style="left: ' + position.toFixed(2) + '%" title="Milestone ' + m.index + ' - ' + new Date(m.timestamp).toLocaleTimeString() + '">' +
                '<span class="milestone-label">' + m.index + '</span>' +
            '</div>';
        }

        return html;
    }

    /**
     * Generate day markers (at midnight) with day labels for progress bar.
     */
    function generateDayMarkers(goalStartMs, goalEndMs) {
        var totalDuration = goalEndMs - goalStartMs;
        var html = '';
        var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        var startDate = new Date(goalStartMs);
        var firstMidnight = new Date(startDate);
        firstMidnight.setHours(24, 0, 0, 0);

        var currentMidnight = firstMidnight.getTime();
        var prevPosition = 0;

        while (currentMidnight < goalEndMs) {
            var position = ((currentMidnight - goalStartMs) / totalDuration) * 100;
            position = Math.min(100, Math.max(0, position));

            html += '<div class="day-marker" style="left: ' + position.toFixed(2) + '%"></div>';

            var labelPosition = (prevPosition + position) / 2;
            if (prevPosition > 0) {
                var prevDay = new Date(currentMidnight - 12 * 60 * 60 * 1000);
                var prevDayName = dayNames[prevDay.getDay()];
                html += '<div class="day-label" style="left: ' + labelPosition.toFixed(2) + '%">' + prevDayName + '</div>';
            }

            prevPosition = position;
            currentMidnight += 24 * 60 * 60 * 1000;
        }

        if (prevPosition > 0 && prevPosition < 100) {
            var lastLabelPosition = (prevPosition + 100) / 2;
            var lastDay = new Date(goalEndMs - 12 * 60 * 60 * 1000);
            var lastDayName = dayNames[lastDay.getDay()];
            if (lastLabelPosition < 95) {
                html += '<div class="day-label" style="left: ' + lastLabelPosition.toFixed(2) + '%">' + lastDayName + '</div>';
            }
        }

        var firstLabelPosition = ((firstMidnight.getTime() - goalStartMs) / totalDuration) * 100 / 2;
        var firstDayName = dayNames[startDate.getDay()];
        if (firstLabelPosition > 10) {
            html += '<div class="day-label" style="left: ' + firstLabelPosition.toFixed(2) + '%">' + firstDayName + '</div>';
        }

        return html;
    }

    /**
     * Calculate week boundaries for week navigation
     */
    function getWeekBoundaries(goalStartMs, goalEndMs, weekOffset, totalDays) {
        var totalWeeks = Math.ceil(totalDays / 7);
        var weekStartMs = goalStartMs + (weekOffset * 7 * 24 * 60 * 60 * 1000);
        var weekEndMs = Math.min(goalEndMs, weekStartMs + (7 * 24 * 60 * 60 * 1000));

        return {
            weekStart: weekStartMs,
            weekEnd: weekEndMs,
            isFirstWeek: weekOffset === 0,
            isLastWeek: weekOffset >= totalWeeks - 1,
            totalWeeks: totalWeeks,
            currentWeek: weekOffset + 1
        };
    }

    /**
     * Calculate day boundaries for day navigation
     */
    function getDayBoundaries(goalStartMs, goalEndMs, dayOffset, totalDays) {
        var dayStartMs = goalStartMs + (dayOffset * 24 * 60 * 60 * 1000);
        var dayEndMs = Math.min(goalEndMs, dayStartMs + (24 * 60 * 60 * 1000));

        return {
            dayStart: dayStartMs,
            dayEnd: dayEndMs,
            isFirstDay: dayOffset === 0,
            isLastDay: dayOffset >= totalDays - 1,
            totalDays: Math.ceil(totalDays),
            currentDay: dayOffset + 1
        };
    }

    /**
     * Calculate milestones per day to determine if we need day view
     */
    function calculateMilestonesPerDayInWeek(milestones, goalStartMs, goalEndMs, weekOffset, totalDays, formatDateFn) {
        var bounds = getWeekBoundaries(goalStartMs, goalEndMs, weekOffset, totalDays);
        var milestonesInWeek = milestones.filter(function(m) {
            return m.timestamp >= bounds.weekStart && m.timestamp <= bounds.weekEnd;
        });

        if (milestonesInWeek.length <= 20) {
            return { needsDayView: false, maxPerDay: 0 };
        }

        var dayMap = {};
        milestonesInWeek.forEach(function(m) {
            var dayKey = formatDateFn(m.timestamp);
            dayMap[dayKey] = (dayMap[dayKey] || 0) + 1;
        });

        var maxPerDay = Math.max.apply(null, Object.values(dayMap));
        return { needsDayView: true, maxPerDay: maxPerDay, totalInWeek: milestonesInWeek.length };
    }

    /**
     * Determine the appropriate view mode for the goal
     */
    function determineViewMode(milestones, goal, weekOffset, formatDateFn) {
        var goalStartMs = goal.createdAt;
        var goalEndMs = goalStartMs + (goal.completionTimeline * 24 * 60 * 60 * 1000);
        var result = calculateMilestonesPerDayInWeek(milestones, goalStartMs, goalEndMs, weekOffset, goal.completionTimeline, formatDateFn);
        return result.needsDayView ? 'day' : 'week';
    }

    /**
     * Get the current week number for a goal based on today's date
     */
    function getCurrentWeekForGoal(goalStartMs, goalEndMs) {
        var now = Date.now();
        if (now < goalStartMs) return 1;
        if (now > goalEndMs) return Math.ceil((goalEndMs - goalStartMs) / (7 * 24 * 60 * 60 * 1000));

        var elapsed = now - goalStartMs;
        return Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) + 1;
    }

    /**
     * Get the current day number for a goal based on today's date
     */
    function getCurrentDayForGoal(goalStartMs, goalEndMs) {
        var now = Date.now();
        if (now < goalStartMs) return 1;
        if (now > goalEndMs) return Math.ceil((goalEndMs - goalStartMs) / (24 * 60 * 60 * 1000));

        var elapsed = now - goalStartMs;
        return Math.floor(elapsed / (24 * 60 * 60 * 1000)) + 1;
    }

    /**
     * Generate week navigator HTML
     */
    function generateWeekNavigator(goal, goalStartMs, goalEndMs) {
        var totalWeeks = Math.ceil(goal.completionTimeline / 7);
        var currentWeek = getCurrentWeekForGoal(goalStartMs, goalEndMs);

        return '<div class="week-navigator" data-view-mode="week">' +
            '<button class="week-nav-btn week-prev" data-direction="prev" ' + (currentWeek <= 1 ? 'disabled' : '') + '>' +
                '<i class="fas fa-chevron-left"></i>' +
            '</button>' +
            '<span class="week-indicator">Week <span class="current-week">' + currentWeek + '</span> of ' + totalWeeks + '</span>' +
            '<button class="week-nav-btn week-next" data-direction="next" ' + (currentWeek >= totalWeeks ? 'disabled' : '') + '>' +
                '<i class="fas fa-chevron-right"></i>' +
            '</button>' +
        '</div>';
    }

    /**
     * Generate day navigator HTML
     */
    function generateDayNavigator(goal, goalStartMs, goalEndMs) {
        var totalDays = Math.ceil(goal.completionTimeline);
        var currentDay = getCurrentDayForGoal(goalStartMs, goalEndMs);
        var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        var currentDayDate = new Date(goalStartMs + ((currentDay - 1) * 24 * 60 * 60 * 1000));
        var dayLabel = dayNames[currentDayDate.getDay()] + ' ' + (currentDayDate.getMonth() + 1) + '/' + currentDayDate.getDate();

        return '<div class="day-navigator" data-view-mode="day">' +
            '<button class="day-nav-btn day-prev" data-direction="prev" ' + (currentDay <= 1 ? 'disabled' : '') + '>' +
                '<i class="fas fa-chevron-left"></i>' +
            '</button>' +
            '<span class="day-indicator">' +
                '<span class="current-day-name">' + dayLabel + '</span> ' +
                '<span class="day-count">(Day <span class="current-day">' + currentDay + '</span> of ' + totalDays + ')</span>' +
            '</span>' +
            '<button class="day-nav-btn day-next" data-direction="next" ' + (currentDay >= totalDays ? 'disabled' : '') + '>' +
                '<i class="fas fa-chevron-right"></i>' +
            '</button>' +
        '</div>';
    }

    /**
     * Generate hour markers for day view
     */
    function generateHourMarkers(goalStartMs, goalEndMs, dayOffset, totalDays) {
        var bounds = getDayBoundaries(goalStartMs, goalEndMs, dayOffset, totalDays);
        var dayDuration = bounds.dayEnd - bounds.dayStart;
        var html = '';

        var startDate = new Date(bounds.dayStart);
        var firstHour = new Date(startDate);
        firstHour.setMinutes(0, 0, 0);
        firstHour.setHours(firstHour.getHours() + 1);

        var currentHour = firstHour.getTime();

        while (currentHour < bounds.dayEnd) {
            var position = ((currentHour - bounds.dayStart) / dayDuration) * 100;
            position = Math.min(100, Math.max(0, position));

            var hourDate = new Date(currentHour);
            var hour = hourDate.getHours();
            var hourLabel = hour === 0 ? '12a' : (hour < 12 ? hour + 'a' : (hour === 12 ? '12p' : (hour - 12) + 'p'));

            var isMajor = hour % 6 === 0;
            var markerClass = isMajor ? 'hour-marker major' : 'hour-marker';

            html += '<div class="' + markerClass + '" style="left: ' + position.toFixed(2) + '%"></div>';

            if (isMajor) {
                html += '<div class="hour-label" style="left: ' + position.toFixed(2) + '%">' + hourLabel + '</div>';
            }

            currentHour += 60 * 60 * 1000;
        }

        return html;
    }

    /**
     * Calculate time progress percentage within current day view
     */
    function getDayTimeProgress(goalStartMs, goalEndMs, dayOffset, totalDays) {
        var bounds = getDayBoundaries(goalStartMs, goalEndMs, dayOffset, totalDays);
        var now = Date.now();

        if (now < bounds.dayStart) return 0;
        if (now > bounds.dayEnd) return 100;

        return Math.min(100, Math.max(0, Math.round(((now - bounds.dayStart) / (bounds.dayEnd - bounds.dayStart)) * 100)));
    }

    /**
     * Calculate time progress percentage within current week view
     */
    function getWeekTimeProgress(goalStartMs, goalEndMs, weekOffset, totalDays) {
        if (totalDays <= 7) {
            var now = Date.now();
            return Math.min(100, Math.max(0, Math.round(((now - goalStartMs) / (goalEndMs - goalStartMs)) * 100)));
        }

        var bounds = getWeekBoundaries(goalStartMs, goalEndMs, weekOffset, totalDays);
        var now = Date.now();

        if (now < bounds.weekStart) return 0;
        if (now > bounds.weekEnd) return 100;

        return Math.min(100, Math.max(0, Math.round(((now - bounds.weekStart) / (bounds.weekEnd - bounds.weekStart)) * 100)));
    }

    /**
     * Generate milestone markers filtered for current day view
     */
    function generateMilestoneMarkersForDay(milestones, goalStartMs, goalEndMs, dayOffset, totalDays) {
        if (!milestones || milestones.length === 0) return '';

        var bounds = getDayBoundaries(goalStartMs, goalEndMs, dayOffset, totalDays);
        var dayDuration = bounds.dayEnd - bounds.dayStart;
        var html = '';

        for (var i = 0; i < milestones.length; i++) {
            var m = milestones[i];
            if (m.timestamp >= bounds.dayStart && m.timestamp <= bounds.dayEnd) {
                var position = ((m.timestamp - bounds.dayStart) / dayDuration) * 100;
                position = Math.min(100, Math.max(0, position));

                var markerClass = 'milestone-marker';
                if (m.isCompleted || m.status === 'completed') markerClass += ' completed';
                if (m.isMissed || m.status === 'missed') markerClass += ' missed';
                if (m.status === 'upcoming') markerClass += ' upcoming';

                html += '<div class="' + markerClass + '" style="left: ' + position.toFixed(2) + '%" title="Milestone ' + m.index + ' - ' + new Date(m.timestamp).toLocaleTimeString() + '">' +
                    '<span class="milestone-label">' + m.index + '</span>' +
                '</div>';
            }
        }

        return html;
    }

    /**
     * Generate milestone markers filtered for current week view
     */
    function generateMilestoneMarkersForWeek(milestones, goalStartMs, goalEndMs, weekOffset, totalDays) {
        if (!milestones || milestones.length === 0) return '';

        if (totalDays <= 7) {
            return generateMilestoneMarkers(milestones, goalStartMs, goalEndMs);
        }

        var bounds = getWeekBoundaries(goalStartMs, goalEndMs, weekOffset, totalDays);
        var weekDuration = bounds.weekEnd - bounds.weekStart;
        var html = '';

        for (var i = 0; i < milestones.length; i++) {
            var m = milestones[i];
            if (m.timestamp >= bounds.weekStart && m.timestamp <= bounds.weekEnd) {
                var position = ((m.timestamp - bounds.weekStart) / weekDuration) * 100;
                position = Math.min(100, Math.max(0, position));

                var markerClass = 'milestone-marker';
                if (m.isCompleted || m.status === 'completed') markerClass += ' completed';
                if (m.isMissed || m.status === 'missed') markerClass += ' missed';
                if (m.status === 'upcoming') markerClass += ' upcoming';

                html += '<div class="' + markerClass + '" style="left: ' + position.toFixed(2) + '%" title="Milestone ' + m.index + ' - ' + new Date(m.timestamp).toLocaleTimeString() + '">' +
                    '<span class="milestone-label">' + m.index + '</span>' +
                '</div>';
            }
        }

        return html;
    }

    /**
     * Generate day markers filtered for current week view
     */
    function generateDayMarkersForWeek(goalStartMs, goalEndMs, weekOffset, totalDays) {
        if (totalDays <= 7) {
            return generateDayMarkers(goalStartMs, goalEndMs);
        }

        var bounds = getWeekBoundaries(goalStartMs, goalEndMs, weekOffset, totalDays);
        var weekDuration = bounds.weekEnd - bounds.weekStart;
        var html = '';
        var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        var startDate = new Date(bounds.weekStart);
        var firstMidnight = new Date(startDate);
        firstMidnight.setHours(24, 0, 0, 0);

        var currentMidnight = firstMidnight.getTime();
        var prevPosition = 0;

        while (currentMidnight < bounds.weekEnd) {
            var position = ((currentMidnight - bounds.weekStart) / weekDuration) * 100;
            position = Math.min(100, Math.max(0, position));

            html += '<div class="day-marker" style="left: ' + position.toFixed(2) + '%"></div>';

            var labelPosition = (prevPosition + position) / 2;
            if (prevPosition > 0) {
                var prevDay = new Date(currentMidnight - 12 * 60 * 60 * 1000);
                var prevDayName = dayNames[prevDay.getDay()];
                html += '<div class="day-label" style="left: ' + labelPosition.toFixed(2) + '%">' + prevDayName + '</div>';
            }

            prevPosition = position;
            currentMidnight += 24 * 60 * 60 * 1000;
        }

        if (prevPosition > 0 && prevPosition < 100) {
            var lastLabelPosition = (prevPosition + 100) / 2;
            var lastDay = new Date(bounds.weekEnd - 12 * 60 * 60 * 1000);
            var lastDayName = dayNames[lastDay.getDay()];
            if (lastLabelPosition < 93) {
                html += '<div class="day-label" style="left: ' + lastLabelPosition.toFixed(2) + '%">' + lastDayName + '</div>';
            }
        }

        var firstLabelPosition = ((firstMidnight.getTime() - bounds.weekStart) / weekDuration) * 100 / 2;
        var firstDayName = dayNames[startDate.getDay()];
        if (firstLabelPosition > 7) {
            html += '<div class="day-label" style="left: ' + firstLabelPosition.toFixed(2) + '%">' + firstDayName + '</div>';
        }

        return html;
    }

    /**
     * Generate progress bar with appropriate navigator based on milestone density
     */
    function generateProgressBarWithNavigator(goal, allMilestones, goalStartMs, goalEndMs, isOnTrack, progressCompletedPct, formatDateFn) {
        var totalDays = goal.completionTimeline;
        var currentWeekOffset = Math.max(0, getCurrentWeekForGoal(goalStartMs, goalEndMs) - 1);
        var viewMode = determineViewMode(allMilestones, goal, currentWeekOffset, formatDateFn);

        var html = '';

        if (viewMode === 'day') {
            var currentDayOffset = Math.max(0, getCurrentDayForGoal(goalStartMs, goalEndMs) - 1);
            var timeProgress = getDayTimeProgress(goalStartMs, goalEndMs, currentDayOffset, totalDays);

            html += generateDayNavigator(goal, goalStartMs, goalEndMs);
            html += '<div class="goal-progress-bar goal-progress-with-markers" data-day-offset="' + currentDayOffset + '" data-view-mode="day">' +
                '<div class="goal-progress-fill time-progress" style="width: ' + timeProgress + '%"></div>' +
                '<div class="goal-progress-fill goal-progress ' + (isOnTrack ? 'on-track' : 'behind') + '" style="width: ' + progressCompletedPct + '%"></div>' +
                '<div class="goal-time-marker" style="left: ' + timeProgress + '%"><span class="now-label">now</span></div>' +
                generateMilestoneMarkersForDay(allMilestones, goalStartMs, goalEndMs, currentDayOffset, totalDays) +
                generateHourMarkers(goalStartMs, goalEndMs, currentDayOffset, totalDays) +
            '</div>';
        } else if (totalDays > 7) {
            var timeProgress = getWeekTimeProgress(goalStartMs, goalEndMs, 0, totalDays);

            html += generateWeekNavigator(goal, goalStartMs, goalEndMs);
            html += '<div class="goal-progress-legend">' +
                '<span class="legend-item"><span class="legend-tick milestone"></span> milestone</span>' +
            '</div>';
            html += '<div class="goal-progress-bar goal-progress-with-markers" data-week-offset="0" data-view-mode="week">' +
                '<div class="goal-progress-fill time-progress" style="width: ' + timeProgress + '%"></div>' +
                '<div class="goal-progress-fill goal-progress ' + (isOnTrack ? 'on-track' : 'behind') + '" style="width: ' + progressCompletedPct + '%"></div>' +
                '<div class="goal-time-marker" style="left: ' + timeProgress + '%"><span class="now-label">now</span></div>' +
                generateMilestoneMarkersForWeek(allMilestones, goalStartMs, goalEndMs, 0, totalDays) +
                generateDayMarkersForWeek(goalStartMs, goalEndMs, 0, totalDays) +
            '</div>';
        } else {
            var timeProgress = getWeekTimeProgress(goalStartMs, goalEndMs, 0, totalDays);

            html += '<div class="goal-progress-legend">' +
                '<span class="legend-item"><span class="legend-tick milestone"></span> milestone</span>' +
            '</div>';
            html += '<div class="goal-progress-bar goal-progress-with-markers" data-week-offset="0" data-view-mode="week">' +
                '<div class="goal-progress-fill time-progress" style="width: ' + timeProgress + '%"></div>' +
                '<div class="goal-progress-fill goal-progress ' + (isOnTrack ? 'on-track' : 'behind') + '" style="width: ' + progressCompletedPct + '%"></div>' +
                '<div class="goal-time-marker" style="left: ' + timeProgress + '%"><span class="now-label">now</span></div>' +
                generateMilestoneMarkersForWeek(allMilestones, goalStartMs, goalEndMs, 0, totalDays) +
                generateDayMarkersForWeek(goalStartMs, goalEndMs, 0, totalDays) +
            '</div>';
        }

        return html;
    }

    /**
     * Update progress bar for new week offset
     * Called when user clicks week navigation buttons
     */
    function updateWeekView($goalDualProgress, newOffset) {
        var goalId = $goalDualProgress.data('goal-id');
        var totalDays = parseInt($goalDualProgress.data('total-days'));
        var goalStartMs = parseInt($goalDualProgress.data('goal-start'));
        var goalEndMs = parseInt($goalDualProgress.data('goal-end'));

        var totalWeeks = Math.ceil(totalDays / 7);
        newOffset = Math.max(0, Math.min(totalWeeks - 1, newOffset));

        var $progressBar = $goalDualProgress.find('.goal-progress-bar');
        $progressBar.data('week-offset', newOffset);

        var jsonObject = StorageModule.retrieveStorageObject();
        var goal = (jsonObject.behavioralGoals || []).find(function(g) { return g.id === goalId; });
        if (!goal) return;

        var actions = jsonObject.action || [];
        var isDoLess = GoalsModule.isDoLessGoal(goal);
        var curveType = isDoLess ? 'power' : 'sigmoid';
        var allMilestones = StatsCalculationsModule.calculateMilestoneSchedule(goal, { curveType: curveType });

        allMilestones = GoalMilestonesModule.processMilestoneStatuses(allMilestones, actions, goal, isDoLess);

        var timeProgress = getWeekTimeProgress(goalStartMs, goalEndMs, newOffset, totalDays);
        $progressBar.find('.time-progress').css('width', timeProgress + '%');
        $progressBar.find('.goal-time-marker').css('left', timeProgress + '%');

        $progressBar.find('.milestone-marker').remove();
        $progressBar.find('.day-marker').remove();
        $progressBar.find('.day-label').remove();

        var newMilestones = generateMilestoneMarkersForWeek(allMilestones, goalStartMs, goalEndMs, newOffset, totalDays);
        var newDayMarkers = generateDayMarkersForWeek(goalStartMs, goalEndMs, newOffset, totalDays);
        $progressBar.append(newMilestones + newDayMarkers);

        var $navigator = $goalDualProgress.find('.week-navigator');
        $navigator.find('.current-week').text(newOffset + 1);

        $navigator.find('.week-prev').prop('disabled', newOffset === 0);
        $navigator.find('.week-next').prop('disabled', newOffset >= totalWeeks - 1);
    }

    /**
     * Update progress bar for new day offset
     * Called when user clicks day navigation buttons
     */
    function updateDayView($goalDualProgress, newOffset) {
        var goalId = $goalDualProgress.data('goal-id');
        var totalDays = parseInt($goalDualProgress.data('total-days'));
        var goalStartMs = parseInt($goalDualProgress.data('goal-start'));
        var goalEndMs = parseInt($goalDualProgress.data('goal-end'));

        newOffset = Math.max(0, Math.min(Math.ceil(totalDays) - 1, newOffset));

        var $progressBar = $goalDualProgress.find('.goal-progress-bar');
        $progressBar.data('day-offset', newOffset);

        var jsonObject = StorageModule.retrieveStorageObject();
        var goal = (jsonObject.behavioralGoals || []).find(function(g) { return g.id === goalId; });
        if (!goal) return;

        var actions = jsonObject.action || [];
        var isDoLess = GoalsModule.isDoLessGoal(goal);
        var curveType = isDoLess ? 'power' : 'sigmoid';
        var allMilestones = StatsCalculationsModule.calculateMilestoneSchedule(goal, { curveType: curveType });

        allMilestones = GoalMilestonesModule.processMilestoneStatuses(allMilestones, actions, goal, isDoLess);

        var timeProgress = getDayTimeProgress(goalStartMs, goalEndMs, newOffset, totalDays);
        $progressBar.find('.time-progress').css('width', timeProgress + '%');
        $progressBar.find('.goal-time-marker').css('left', timeProgress + '%');

        $progressBar.find('.milestone-marker').remove();
        $progressBar.find('.hour-marker').remove();
        $progressBar.find('.hour-label').remove();

        var newMilestones = generateMilestoneMarkersForDay(allMilestones, goalStartMs, goalEndMs, newOffset, totalDays);
        var newHourMarkers = generateHourMarkers(goalStartMs, goalEndMs, newOffset, totalDays);
        $progressBar.append(newMilestones + newHourMarkers);

        var $navigator = $goalDualProgress.find('.day-navigator');
        var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        var currentDayDate = new Date(goalStartMs + (newOffset * 24 * 60 * 60 * 1000));
        var dayLabel = dayNames[currentDayDate.getDay()] + ' ' + (currentDayDate.getMonth() + 1) + '/' + currentDayDate.getDate();

        $navigator.find('.current-day').text(newOffset + 1);
        $navigator.find('.current-day-name').text(dayLabel);

        $navigator.find('.day-prev').prop('disabled', newOffset === 0);
        $navigator.find('.day-next').prop('disabled', newOffset >= Math.ceil(totalDays) - 1);
    }

    /**
     * Initialize milestone calendars after rendering
     * Called when accordion expands
     */
    function initMilestoneCalendars() {
        $('.goal-milestone-calendar').each(function() {
            var $calendar = $(this);

            if ($calendar.hasClass('ui-datepicker-inline')) return;

            var goalId = $calendar.data('goal-id');
            var milestoneDatesStr = $calendar.data('milestone-dates');
            var goalStart = new Date(parseInt($calendar.data('goal-start')));
            var goalEnd = new Date(parseInt($calendar.data('goal-end')));

            var milestoneDates = [];
            try {
                milestoneDates = JSON.parse(decodeURIComponent(milestoneDatesStr));
            } catch (e) {
                console.warn('Could not parse milestone dates:', e);
            }

            var dateStatusMap = {};
            var dateCountMap = {};
            var maxCount = 1;

            milestoneDates.forEach(function(m) {
                dateStatusMap[m.date] = m.status;
                dateCountMap[m.date] = m.count || 1;
                if (dateCountMap[m.date] > maxCount) {
                    maxCount = dateCountMap[m.date];
                }
            });

            $calendar.datepicker({
                minDate: goalStart,
                maxDate: goalEnd,
                onSelect: function(dateText, inst) {
                    filterMilestonesByDate(goalId, dateText);
                },
                beforeShowDay: function(date) {
                    var dateStr = GoalMilestonesModule.formatDateForCalendar(date.getTime());
                    var status = dateStatusMap[dateStr];
                    var count = dateCountMap[dateStr] || 0;

                    var densityClass = count > 0 ? 'milestone-density-' + Math.min(5, Math.ceil((count / maxCount) * 5)) : '';

                    if (status === 'completed') {
                        return [true, 'milestone-day milestone-completed ' + densityClass, count + ' milestone(s) - Completed'];
                    } else if (status === 'missed') {
                        return [true, 'milestone-day milestone-missed ' + densityClass, count + ' milestone(s) - Missed'];
                    } else if (status === 'upcoming') {
                        return [true, 'milestone-day milestone-upcoming ' + densityClass, count + ' milestone(s) - Upcoming'];
                    } else if (count > 0) {
                        return [true, 'milestone-day ' + densityClass, count + ' milestone(s)'];
                    }
                    return [true, '', ''];
                }
            });
        });
    }

    /**
     * Filter milestones list by selected date
     * Re-renders the milestone list from the cached data, filtered to the selected date
     */
    function filterMilestonesByDate(goalId, dateText) {
        var $container = $('.goal-milestones[data-goal-id="' + goalId + '"]');
        var $listContainer = $container.find('.milestones-list-container');
        var $filterInfo = $container.closest('.goal-details-content').find('.calendar-filter-info');

        var cached = GoalsModule.getMilestoneCache(goalId);
        if (!cached) {
            console.warn('No cached milestone data for goal:', goalId);
            return;
        }

        var allMilestones = cached.all;
        var isDoLess = cached.isDoLess;

        if (!dateText) {
            $listContainer.html(GoalMilestonesModule.renderMilestoneDaySummaries(allMilestones, isDoLess, goalId));
            $filterInfo.hide();
            return;
        }

        var selectedDateStr;

        if (dateText.indexOf('/') > -1) {
            var parts = dateText.split('/');
            var month = ('0' + parts[0]).slice(-2);
            var day = ('0' + parts[1]).slice(-2);
            var year = parts[2];
            selectedDateStr = year + '-' + month + '-' + day;
        } else if (dateText.indexOf('-') > -1) {
            selectedDateStr = dateText;
        } else {
            var d = new Date(dateText + 'T12:00:00');
            selectedDateStr = GoalMilestonesModule.formatDateForCalendar(d.getTime());
        }

        var selectedDate = new Date(selectedDateStr + 'T12:00:00');

        var filteredMilestones = allMilestones.filter(function(m) {
            var mileDateStr = GoalMilestonesModule.formatDateForCalendar(m.timestamp);
            return mileDateStr === selectedDateStr;
        });

        var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        var displayDate = dayNames[selectedDate.getDay()] + ' ' + (selectedDate.getMonth() + 1) + '/' + selectedDate.getDate();

        if (filteredMilestones.length > 0) {
            $listContainer.html(GoalMilestonesModule.renderMilestonesList(filteredMilestones, isDoLess));
        } else {
            $listContainer.html('<p class="text-muted text-center">No milestones on this date.</p>');
        }

        $filterInfo.find('.filter-date').text(displayDate + ' — ' + filteredMilestones.length + ' milestone' + (filteredMilestones.length !== 1 ? 's' : ''));
        $filterInfo.show();
    }

    // Public API
    return {
        generateMilestoneMarkers: generateMilestoneMarkers,
        generateDayMarkers: generateDayMarkers,
        getWeekBoundaries: getWeekBoundaries,
        getDayBoundaries: getDayBoundaries,
        getCurrentWeekForGoal: getCurrentWeekForGoal,
        getCurrentDayForGoal: getCurrentDayForGoal,
        generateWeekNavigator: generateWeekNavigator,
        generateDayNavigator: generateDayNavigator,
        generateHourMarkers: generateHourMarkers,
        getDayTimeProgress: getDayTimeProgress,
        getWeekTimeProgress: getWeekTimeProgress,
        generateMilestoneMarkersForDay: generateMilestoneMarkersForDay,
        generateMilestoneMarkersForWeek: generateMilestoneMarkersForWeek,
        generateDayMarkersForWeek: generateDayMarkersForWeek,
        generateProgressBarWithNavigator: generateProgressBarWithNavigator,
        updateWeekView: updateWeekView,
        updateDayView: updateDayView,
        initMilestoneCalendars: initMilestoneCalendars,
        filterMilestonesByDate: filterMilestonesByDate
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoalVisualizationModule;
} else {
    window.GoalVisualizationModule = GoalVisualizationModule;
}
