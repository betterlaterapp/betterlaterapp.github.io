/**
 * GoalMilestonesModule
 * Handles milestone generation, scheduling, status processing, and rendering
 * for behavioral goals.
 */
var GoalMilestonesModule = (function() {

    /**
     * Generate schedule milestones for quantifiable goal.
     * This is ACTION-AWARE: it factors in user actions to determine which
     * milestones are completed, missed, or upcoming.
     *
     * @param {Object} goal - Behavioral goal object
     * @param {Object} jsonObject - Storage object with actions and baseline
     * @returns {Object} - { display: Array, all: Array, originalTotal, remainingNeeded }
     */
    function generateScheduleMilestones(goal, jsonObject) {
        var baseline = (jsonObject.option && jsonObject.option.baseline) || {};
        var isDoLess = baseline.doLess === true;
        var actions = jsonObject.action || [];

        var now = Date.now();
        var goalStartMs = goal.createdAt;
        var goalEndMs = goalStartMs + (goal.completionTimeline * 24 * 60 * 60 * 1000);
        var goalStartSec = Math.floor(goalStartMs / 1000);

        // Get relevant actions since goal started
        var relevantActions = getRelevantActions(goal, actions, goalStartSec);
        var actionCount = relevantActions.length;

        // Get the ORIGINAL schedule for historical reference
        var curveType = isDoLess ? 'power' : 'sigmoid';
        var originalSchedule = StatsCalculationsModule.calculateMilestoneSchedule(goal, {
            curveType: curveType
        });
        if (!originalSchedule || originalSchedule.length === 0) {
            return { display: [], all: [] };
        }

        var totalMilestones = originalSchedule.length;

        // Sort actions by timestamp
        relevantActions.sort(function(a, b) {
            return parseInt(a.timestamp) - parseInt(b.timestamp);
        });

        // Find how many original milestones have passed
        var passedMilestoneCount = 0;
        for (var i = 0; i < originalSchedule.length; i++) {
            if (originalSchedule[i].timestamp <= now) {
                passedMilestoneCount++;
            }
        }

        // Calculate remaining milestones needed
        var remainingMilestonesNeeded = Math.max(0, totalMilestones - actionCount);

        // Get recalculated UPCOMING milestones from current time
        var upcomingSchedule = [];
        if (remainingMilestonesNeeded > 0 && now < goalEndMs) {
            upcomingSchedule = StatsCalculationsModule.calculateMilestoneSchedule(goal, {
                curveType: curveType,
                actionCount: actionCount,
                recalculateFromNow: true
            });
        }

        // Build combined schedule
        var combinedMilestones = [];
        var milestoneIndex = 1;

        // Add past milestones from original schedule
        for (var i = 0; i < originalSchedule.length; i++) {
            var m = originalSchedule[i];
            if (m.timestamp <= now) {
                var actionsBeforeThis = relevantActions.filter(function(a) {
                    return parseInt(a.timestamp) * 1000 <= m.timestamp;
                }).length;

                var status;
                if (isDoLess) {
                    status = actionsBeforeThis <= i ? 'completed' : 'missed';
                } else {
                    status = actionsBeforeThis > i ? 'completed' : 'missed';
                }

                combinedMilestones.push({
                    timestamp: m.timestamp,
                    index: milestoneIndex++,
                    status: status,
                    progress: m.progress,
                    intervalMs: m.intervalMs
                });
            }
        }

        // Add upcoming milestones from recalculated schedule
        for (var i = 0; i < upcomingSchedule.length; i++) {
            var m = upcomingSchedule[i];
            combinedMilestones.push({
                timestamp: m.timestamp,
                index: milestoneIndex++,
                status: 'upcoming',
                progress: m.progress,
                intervalMs: m.intervalMs
            });
        }

        // Format ALL milestones
        var allFormatted = combinedMilestones.map(function(m) {
            return {
                label: 'Milestone ' + m.index,
                percentage: Math.round((m.progress || 0) * 100),
                timestamp: m.timestamp,
                date: new Date(m.timestamp),
                isPast: m.status !== 'upcoming',
                isCompleted: m.status === 'completed',
                isMissed: m.status === 'missed',
                status: m.status,
                index: m.index,
                totalMilestones: totalMilestones,
                intervalMs: m.intervalMs
            };
        });

        return {
            display: allFormatted,
            all: allFormatted,
            originalTotal: totalMilestones,
            remainingNeeded: remainingMilestonesNeeded
        };
    }

    /**
     * Get relevant actions for a goal since goal started.
     */
    function getRelevantActions(goal, actions, goalStartSec) {
        var unit = goal.unit;
        return actions.filter(function(a) {
            if (!a || parseInt(a.timestamp) < goalStartSec) return false;

            if (unit === 'times') {
                return a.clickType === 'used' || a.clickType === 'timed';
            } else if (unit === 'minutes') {
                return a.clickType === 'timed' && a.duration;
            } else if (unit === 'dollars') {
                return a.clickType === 'bought' && a.spent;
            }
            return false;
        });
    }

    /**
     * Process milestone statuses based on actions
     */
    function processMilestoneStatuses(milestones, actions, goal, isDoLess) {
        var now = Date.now();
        var goalStartSec = Math.floor(goal.createdAt / 1000);

        var relevantActions = actions.filter(function(a) {
            if (!a || parseInt(a.timestamp) < goalStartSec) return false;
            if (goal.unit === 'times') {
                return a.clickType === 'used' || a.clickType === 'timed';
            }
            return false;
        }).sort(function(a, b) {
            return parseInt(a.timestamp) - parseInt(b.timestamp);
        });

        var actionIndex = 0;
        return milestones.map(function(m) {
            var isPast = m.timestamp < now;
            var status = 'upcoming';

            if (isPast) {
                if (isDoLess) {
                    var actionsBeforeMilestone = relevantActions.filter(function(a) {
                        return parseInt(a.timestamp) * 1000 < m.timestamp;
                    }).length;
                    status = actionsBeforeMilestone > actionIndex ? 'missed' : 'completed';
                    if (actionsBeforeMilestone > actionIndex) actionIndex = actionsBeforeMilestone;
                } else {
                    while (actionIndex < relevantActions.length &&
                           parseInt(relevantActions[actionIndex].timestamp) * 1000 <= m.timestamp) {
                        actionIndex++;
                    }
                    status = actionIndex >= m.index ? 'completed' : 'missed';
                }
            }

            return Object.assign({}, m, { status: status, isPast: isPast });
        });
    }

    /**
     * Format timestamp as YYYY-MM-DD for calendar matching
     */
    function formatDateForCalendar(timestamp) {
        var d = new Date(timestamp);
        var year = d.getFullYear();
        var month = ('0' + (d.getMonth() + 1)).slice(-2);
        var day = ('0' + d.getDate()).slice(-2);
        return year + '-' + month + '-' + day;
    }

    /**
     * Convert milestones array to JSON string with dates for calendar.
     */
    function getMilestoneDatesJson(milestones) {
        var dateMap = {};
        milestones.forEach(function(m) {
            var dateStr = formatDateForCalendar(m.timestamp);
            if (!dateMap[dateStr]) {
                dateMap[dateStr] = { date: dateStr, count: 0, statuses: [] };
            }
            dateMap[dateStr].count++;
            dateMap[dateStr].statuses.push(m.status || (m.isPast ? 'past' : 'upcoming'));
        });

        var dates = Object.values(dateMap).map(function(d) {
            var status = 'upcoming';
            if (d.statuses.indexOf('missed') !== -1) {
                status = 'missed';
            } else if (d.statuses.indexOf('completed') !== -1) {
                status = 'completed';
            }
            return {
                date: d.date,
                status: status,
                count: d.count
            };
        });
        return encodeURIComponent(JSON.stringify(dates));
    }

    /**
     * Render day summaries for milestones (default view).
     */
    function renderMilestoneDaySummaries(milestones, isDoLess, goalId) {
        if (!milestones || milestones.length === 0) {
            return '<p class="text-muted text-center" style="font-size: 0.85rem;">No milestones generated.</p>';
        }

        var dayGroups = {};
        milestones.forEach(function(m) {
            var dayKey = formatDateForCalendar(m.timestamp);

            if (!dayGroups[dayKey]) {
                var noonDate = new Date(dayKey + 'T12:00:00');
                dayGroups[dayKey] = {
                    date: noonDate,
                    dateKey: dayKey,
                    milestones: [],
                    timestamps: []
                };
            }
            dayGroups[dayKey].milestones.push(m);
            dayGroups[dayKey].timestamps.push(m.timestamp);
        });

        var sortedDays = Object.keys(dayGroups).sort();

        var html = '';
        sortedDays.forEach(function(dayKey) {
            var group = dayGroups[dayKey];
            var count = group.milestones.length;
            var dateObj = group.date;

            var dayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
            var dayName = dayNames[dateObj.getDay()];
            var dateLabel = dayName + ' ' + (dateObj.getMonth() + 1) + '/' + dateObj.getDate();

            var avgInterval = '';
            if (count > 1) {
                group.timestamps.sort(function(a, b) { return a - b; });
                var totalInterval = 0;
                for (var i = 1; i < group.timestamps.length; i++) {
                    totalInterval += group.timestamps[i] - group.timestamps[i - 1];
                }
                var avgMs = totalInterval / (count - 1);
                avgInterval = formatIntervalDuration(avgMs);
            }

            var completed = group.milestones.filter(function(m) { return m.status === 'completed'; }).length;
            var missed = group.milestones.filter(function(m) { return m.status === 'missed'; }).length;
            var upcoming = count - completed - missed;

            var dayStatus = 'upcoming';
            if (upcoming === 0 && completed > 0 && missed === 0) {
                dayStatus = 'completed';
            } else if (upcoming === 0 && missed > 0) {
                dayStatus = 'missed';
            } else if (completed > 0 || missed > 0) {
                dayStatus = 'mixed';
            }

            html += '<div class="milestone-day-summary ' + dayStatus + '" data-date="' + dayKey + '" data-goal-id="' + goalId + '">' +
                '<div class="day-summary-header">' +
                    '<span class="day-summary-date">' + dateLabel + '</span>' +
                    '<span class="day-summary-count">' + count + ' milestone' + (count !== 1 ? 's' : '') + '</span>' +
                '</div>' +
                '<div class="day-summary-stats">' +
                    (avgInterval ? '<span class="day-summary-interval">' + (isDoLess ? 'Avg wait: ' : 'Avg interval: ') + avgInterval + '</span>' : '') +
                    (completed > 0 ? '<span class="status-completed">' + completed + ' ✓</span>' : '') +
                    (missed > 0 ? '<span class="status-missed">' + missed + ' ✗</span>' : '') +
                    (upcoming > 0 ? '<span class="status-upcoming">' + upcoming + ' pending</span>' : '') +
                '</div>' +
            '</div>';
        });

        return html;
    }

    /**
     * Format interval duration for display (e.g., "1h 30m" or "45m")
     */
    function formatIntervalDuration(ms) {
        var totalMins = Math.round(ms / (1000 * 60));
        var hours = Math.floor(totalMins / 60);
        var mins = totalMins % 60;

        if (hours > 0) {
            return hours + 'h ' + mins + 'm';
        }
        return mins + 'm';
    }

    /**
     * Render milestones list for a filtered day view.
     */
    function renderMilestonesList(milestones, isDoLess) {
        if (!milestones || milestones.length === 0) {
            return '<p class="text-muted text-center" style="font-size: 0.85rem;">No milestones for this day.</p>';
        }

        var html = '';

        milestones.forEach(function(m, idx) {
            var dateObj = m.date instanceof Date ? m.date : new Date(m.timestamp);

            var dayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
            var dayName = dayNames[dateObj.getDay()];
            var timeStr = formatMilestoneTimeCompact(m.timestamp);
            var dateTimeStr = dayName + ' at ' + timeStr;

            var statusClass = '';
            if (m.status === 'completed' || m.isCompleted) {
                statusClass = 'milestone-completed';
            } else if (m.status === 'missed' || m.isMissed) {
                statusClass = 'milestone-missed';
            } else {
                statusClass = 'milestone-upcoming';
            }

            var milestoneNum = m.index || (idx + 1);

            html += '<div class="milestone-card ' + statusClass + '">' +
                '<div class="milestone-num">' + milestoneNum + '</div>' +
                '<div class="milestone-info">' +
                    '<span class="milestone-datetime">' + dateTimeStr + '</span>' +
                    '<span class="milestone-progress">' + m.percentage + '% through goal</span>' +
                '</div>' +
            '</div>';
        });
        return html;
    }

    /**
     * Format time in compact format: "4:36pm" or "7:56am"
     */
    function formatMilestoneTimeCompact(timestampMs) {
        var date = new Date(timestampMs);
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'pm' : 'am';

        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;

        return hours + ':' + minutes + ampm;
    }

    /**
     * Format milestone timestamp as clock time (e.g., "3:45pm")
     */
    function formatMilestoneClockTime(timestampMs) {
        var date = new Date(timestampMs);
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'pm' : 'am';

        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;

        return hours + ':' + minutes + '' + ampm;
    }

    // Public API
    return {
        generateScheduleMilestones: generateScheduleMilestones,
        getRelevantActions: getRelevantActions,
        processMilestoneStatuses: processMilestoneStatuses,
        formatDateForCalendar: formatDateForCalendar,
        getMilestoneDatesJson: getMilestoneDatesJson,
        renderMilestoneDaySummaries: renderMilestoneDaySummaries,
        renderMilestonesList: renderMilestonesList,
        formatIntervalDuration: formatIntervalDuration,
        formatMilestoneTimeCompact: formatMilestoneTimeCompact,
        formatMilestoneClockTime: formatMilestoneClockTime
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoalMilestonesModule;
} else {
    window.GoalMilestonesModule = GoalMilestonesModule;
}