/**
 * GoalMilestonesModule
 * Handles milestone generation, scheduling, status processing, and rendering
 * for behavioral goals.
 */
var GoalMilestonesModule = (function() {

    var EPSILON = 1e-9;

    /**
     * Generate the goal's milestones with a status for each one, plus the next
     * milestone and on-track status. Every screen showing milestones uses this.
     *
     * @param {Object} goal - Behavioral goal object
     * @param {Array} actions - Action log
     * @param {boolean} isDoLess - Whether the user is trying to do less
     * @returns {Object} - { all, display, originalTotal, remainingNeeded, completedCount,
     *                       missedCount, actionUnits, next, track }
     */
    function generateScheduleMilestones(goal, actions, isDoLess) {
        var schedule = StatsCalculationsModule.calculateMilestoneSchedule(goal);
        var now = Date.now();
        var events = getGoalEvents(goal, actions || [], isDoLess);
        var actionUnits = Math.floor(events.reduce(function(sum, e) { return sum + e.units; }, 0) + EPSILON);

        var scored = isDoLess
            ? scoreDoLessMilestones(schedule, events, goal.createdAt, now)
            : scoreDoMoreMilestones(schedule, events, now);

        var all = schedule.map(function(m, i) {
            var status = scored.statuses[i];
            return {
                label: 'Milestone ' + m.index,
                percentage: Math.round((m.progress || 0) * 100),
                timestamp: m.timestamp,
                date: new Date(m.timestamp),
                isPast: m.timestamp <= now,
                isCompleted: status === 'completed',
                isMissed: status === 'missed',
                status: status,
                index: m.index,
                totalMilestones: schedule.length,
                intervalMs: m.intervalMs
            };
        });

        var count = function(status) {
            return all.filter(function(m) { return m.status === status; }).length;
        };

        return {
            all: all,
            display: all,
            originalTotal: all.length,
            remainingNeeded: count('upcoming'),
            completedCount: count('completed'),
            missedCount: count('missed'),
            passedCount: all.filter(function(m) { return m.isPast; }).length,
            actionUnits: actionUnits,
            next: scored.next,
            track: scored.track
        };
    }

    /**
     * Actions that count toward a goal since it started, as
     * {timestampMs, units} sorted oldest first. When doing more of a habit,
     * "times" are sessions: 20 pushups then 15 situps count once.
     */
    function getGoalEvents(goal, actions, isDoLess) {
        var Calc = StatsCalculationsModule;
        var goalStartSec = Math.floor(goal.createdAt / 1000);
        var sinceStart = actions.filter(function(a) {
            return a && parseInt(a.timestamp) >= goalStartSec;
        });

        if (!isDoLess && goal.unit === 'times') {
            return Calc.groupIntoSessions(sinceStart).map(function(session) {
                return {
                    timestampMs: session.start * 1000,
                    units: 1 / Calc.getMilestoneUnitSize(goal)
                };
            });
        }

        return sinceStart.map(function(a) {
            return {
                timestampMs: parseInt(a.timestamp) * 1000,
                units: Calc.getActionMilestoneUnits(goal, a)
            };
        }).filter(function(e) {
            return e.units > 0;
        }).sort(function(a, b) {
            return a.timestampMs - b.timestampMs;
        });
    }

    function sumUnitsBetween(events, afterMs, untilMs) {
        return events.reduce(function(sum, e) {
            return (e.timestampMs > afterMs && e.timestampMs <= untilMs) ? sum + e.units : sum;
        }, 0);
    }

    /**
     * Do more: each milestone is a "do it by" deadline. Work done before a
     * deadline counts toward it and extra work banks forward, but a missed
     * deadline expires rather than piling onto later ones, so falling behind
     * never asks the user to cram sessions together to catch up.
     */
    function scoreDoMoreMilestones(schedule, events, now) {
        var credit = 0;
        var eventIndex = 0;
        var statuses = schedule.map(function(m) {
            var isPast = m.timestamp <= now;
            var cutoff = isPast ? m.timestamp : now;
            while (eventIndex < events.length && events[eventIndex].timestampMs <= cutoff) {
                credit += events[eventIndex].units;
                eventIndex++;
            }
            if (credit >= 1 - EPSILON) {
                credit -= 1;
                return 'completed';
            }
            return isPast ? 'missed' : 'upcoming';
        });

        var next = null;
        for (var i = 0; i < schedule.length; i++) {
            if (statuses[i] === 'upcoming') {
                next = { timestamp: schedule[i].timestamp, index: schedule[i].index, availableNow: false };
                break;
            }
        }

        var banked = 0;
        var recentMisses = 0;
        schedule.forEach(function(m, i) {
            if (m.timestamp > now && statuses[i] === 'completed') banked++;
            if (m.timestamp <= now) recentMisses = statuses[i] === 'missed' ? recentMisses + 1 : 0;
        });

        var track = { status: 'on-track', count: 0 };
        if (recentMisses > 0) {
            track = { status: 'behind', count: recentMisses };
        } else if (banked > 0) {
            track = { status: 'ahead', count: banked };
        }

        return { statuses: statuses, next: next, track: track };
    }

    /**
     * Do less: each milestone unlocks one more use ("wait until"). A milestone
     * is kept if no more than the unlocked amount was used in the window
     * leading up to it (nothing before the first one). Each window is judged
     * on its own: a slip costs that one milestone and the plan carries on,
     * with no debt to pay down. Unused allowance doesn't bank either, so
     * saving up for a binge isn't rewarded.
     */
    function scoreDoLessMilestones(schedule, events, goalStartMs, now) {
        var windowStart = goalStartMs;
        var statuses = schedule.map(function(m, i) {
            if (m.timestamp > now) return 'upcoming';
            var allowance = i === 0 ? 0 : 1;
            var used = sumUnitsBetween(events, windowStart, m.timestamp);
            windowStart = m.timestamp;
            return used <= allowance + EPSILON ? 'completed' : 'missed';
        });

        // Current window: from the last passed milestone (or goal start) until the next one
        var lastPassed = -1;
        for (var i = 0; i < schedule.length; i++) {
            if (schedule[i].timestamp <= now) lastPassed = i;
        }
        var currentWindowStart = lastPassed >= 0 ? schedule[lastPassed].timestamp : goalStartMs;
        var currentAllowance = lastPassed >= 0 ? 1 : 0;
        var usedThisWindow = sumUnitsBetween(events, currentWindowStart, now);
        var nextMilestone = schedule[lastPassed + 1];

        var next = null;
        if (nextMilestone) {
            next = {
                timestamp: nextMilestone.timestamp,
                index: nextMilestone.index,
                availableNow: usedThisWindow < currentAllowance - EPSILON
            };
        }

        var recentMisses = 0;
        for (var j = 0; j <= lastPassed; j++) {
            recentMisses = statuses[j] === 'missed' ? recentMisses + 1 : 0;
        }
        if (usedThisWindow > currentAllowance + EPSILON) recentMisses++;

        var track = recentMisses > 0
            ? { status: 'behind', count: recentMisses }
            : { status: 'on-track', count: 0 };

        return { statuses: statuses, next: next, track: track };
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