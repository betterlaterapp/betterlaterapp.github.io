/**
 * BriefStatsModule - Quick summary stats bar
 * Shows key metrics at a glance: last time, next milestone, time today, resist streak
 */
var BriefStatsModule = (function () {
    var json;
    
    /**
     * Initialize the module with app state
     * @param {Object} appJson - App state object
     */
    function init(appJson) {
        json = appJson;
        // Only update if we have storage data
        if (StorageModule.hasStorageData()) {
            updateAllStats();
        }
    }
    
    /**
     * Show the brief stats bar
     */
    function show() {
        $('#brief-stats').removeClass('d-none');
    }
    
    /**
     * Hide the brief stats bar
     */
    function hide() {
        $('#brief-stats').addClass('d-none');
    }
    
    /**
     * Update all stats in the bar
     */
    function updateAllStats() {
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject) {
            hide();
            return;
        }
        
        var baseline = jsonObject.baseline || {};
        var isDecreaseHabit = baseline.decreaseHabit;
        
        // Track which stats are visible
        var visibleStats = [];
        
        // Reset d-none on all stats before recalculating
        $('.stat-brief').addClass('d-none');
        
        // Update last done timer (shows if times-done OR time-spent selected)
        var lastDoneVisible = updateLastDoneStat(baseline);
        if (lastDoneVisible) visibleStats.push('last-done');
        
        // Update last spent timer (shows if money-spent selected)
        var lastSpentVisible = updateLastSpentStat(baseline);
        if (lastSpentVisible) visibleStats.push('last-spent');
        
        // Update milestone stat (if user has goals)
        var milestoneVisible = updateMilestoneStat(jsonObject, baseline);
        if (milestoneVisible) visibleStats.push('milestone');
        
        // Update time today stat
        var timeTodayVisible = updateTimeTodayStat(jsonObject, baseline);
        if (timeTodayVisible) visibleStats.push('time-today');
        
        // Update did/didn't pie chart (do-less only)
        if (isDecreaseHabit) {
            var didDidntVisible = updateDidDidntStat(jsonObject);
            if (didDidntVisible) visibleStats.push('did-didnt');
            
            // Update resist streak
            var streakVisible = updateResistStreakStat(jsonObject);
            if (streakVisible) visibleStats.push('resist-streak');
        }
        
        // Max number of items per row is 3 - hide any more than 3
        if (visibleStats.length > 3) {
            // Keep only the first 3
            for (var i = 3; i < visibleStats.length; i++) {
                var statId = visibleStats[i];
                if (statId === 'last-done') $('.stat-brief.stat-last-done').addClass('d-none');
                if (statId === 'last-spent') $('.stat-brief.stat-last-spent').addClass('d-none');
                if (statId === 'time-today') $('.stat-brief.stat-time-today').addClass('d-none');
                if (statId === 'did-didnt') $('.stat-brief.stat-did-didnt').addClass('d-none');
                if (statId === 'resist-streak') $('.stat-brief.stat-resist-streak').addClass('d-none');
                if (statId === 'milestone') $('.stat-brief.stat-next-milestone').addClass('d-none');
            }
            visibleStats = visibleStats.slice(0, 3);
        }
        
        // Show/hide the bar based on whether we have any stats to display
        if (visibleStats.length > 0) {
            show();
            updateStatSizeClass(visibleStats.length);
        } else {
            hide();
        }
    }
    
    /**
     * Update size class on container based on visible stat count
     * @param {number} count - Number of visible stats
     */
    function updateStatSizeClass(count) {
        var $container = $('.brief-stats-container');
        
        // Remove all count classes
        $container.removeClass('stats-count-1 stats-count-2 stats-count-3');
        
        // Add appropriate class (max 3 stats)
        $container.addClass('stats-count-' + Math.min(count, 3));
    }
    
    /**
     * Update the "Last done" timer visibility
     * Shows if user has times-done OR time-spent selected
     * @param {Object} baseline - Baseline settings
     * @returns {boolean} - Whether stat should be visible
     */
    function updateLastDoneStat(baseline) {
        var $stat = $('.stat-brief.stat-last-done');
        
        // Show if times-done OR time-spent is selected
        if (baseline.valuesTimesDone || baseline.valuesTime) {
            $stat.removeClass('d-none');
            return true;
        }
        
        $stat.addClass('d-none');
        return false;
    }
    
    /**
     * Update the "Last spent" timer visibility
     * Shows if user has money-spent selected
     * @param {Object} baseline - Baseline settings
     * @returns {boolean} - Whether stat should be visible
     */
    function updateLastSpentStat(baseline) {
        var $stat = $('.stat-brief.stat-last-spent');
        
        // Show if money-spent is selected
        if (baseline.valuesMoney && !baseline.valuesTime && !baseline.valuesTimesDone) {
            $stat.removeClass('d-none');
            return true;
        }
        
        $stat.addClass('d-none');
        return false;
    }
    
    /**
     * Update the milestone stat ("Do it by" / "Wait until")
     * @param {Object} jsonObject - Storage object
     * @param {Object} baseline - Baseline settings
     * @returns {boolean} - Whether stat has displayable value
     */
    function updateMilestoneStat(jsonObject, baseline) {
        var isDecreaseHabit = baseline.decreaseHabit;
        var goalElement = isDecreaseHabit ? '#brief-wait-until' : '#brief-do-it-by';
        var $stat = isDecreaseHabit ? $('.stat-brief.stat-next-milestone.do-less-only') : $('.stat-brief.stat-next-milestone.do-more-only');
        
        // Check if user has a times-done goal
        var hasGoal = baseline.goalDonePerWeek && parseInt(baseline.goalDonePerWeek) > 0;
        
        if (!hasGoal || !baseline.valuesTimesDone) {
            $stat.addClass('d-none');
            return false;
        }
        
        // Calculate next milestone
        var milestone = calculateNextMilestone(jsonObject, baseline);
        
        if (milestone) {
            $(goalElement).text(milestone.display);
        } else {
            $(goalElement).text('On track');
        }
        
        $stat.removeClass('d-none');
        return true;
    }
    
    /**
     * Calculate the next milestone time
     * @param {Object} jsonObject - Storage object
     * @param {Object} baseline - Baseline settings
     * @returns {Object|null} - Milestone info or null
     */
    function calculateNextMilestone(jsonObject, baseline) {
        var isDecreaseHabit = baseline.decreaseHabit;
        var currentPerWeek = parseInt(baseline.amountDonePerWeek) || 0;
        var goalPerWeek = parseInt(baseline.goalDonePerWeek) || 0;
        var achieveInWeeks = parseInt(baseline.achieveGoalInWeeks) || 1;
        
        // Get actions from the current week
        var now = Math.round(new Date() / 1000);
        var weekStart = now - (7 * 24 * 60 * 60);
        var actionsThisWeek = (jsonObject.action || []).filter(function(a) {
            return a && (a.clickType === 'used' || a.clickType === 'timed') && 
                   parseInt(a.timestamp) > weekStart;
        }).length;
        
        // Calculate expected progress for today
        var dayOfWeek = new Date().getDay(); // 0 = Sunday
        var daysIntoWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
        
        if (isDecreaseHabit) {
            // For "do less": calculate how long they should wait before next action
            // If goal is 7/week and they've done 5, they have 2 "allowances" left for the week
            var allowancesLeft = Math.max(0, goalPerWeek - actionsThisWeek);
            var daysLeft = 7 - daysIntoWeek;
            
            if (allowancesLeft === 0) {
                return { display: 'Wait!', urgent: true };
            }
            
            if (daysLeft > 0 && allowancesLeft > 0) {
                // Calculate hours until they can do it again
                var hoursUntilNext = Math.floor((daysLeft * 24) / allowancesLeft);
                if (hoursUntilNext < 24) {
                    return { display: hoursUntilNext + 'h', urgent: false };
                } else {
                    var daysUntil = Math.floor(hoursUntilNext / 24);
                    return { display: daysUntil + 'd', urgent: false };
                }
            }
            
            return { display: 'OK now', urgent: false };
            
        } else {
            // For "do more": calculate when they should do the next action
            // Linear interpolation from current to goal over achieve period
            var targetForToday = Math.ceil((goalPerWeek / 7) * daysIntoWeek);
            var behind = targetForToday - actionsThisWeek;
            
            if (behind <= 0) {
                return null; // On track or ahead
            }
            
            // Calculate when they need to do it
            var hoursLeftToday = 24 - new Date().getHours();
            var actionsNeededToday = Math.max(1, behind);
            
            if (actionsNeededToday === 1) {
                return { display: 'Today', urgent: hoursLeftToday < 6 };
            } else {
                return { display: actionsNeededToday + ' today', urgent: true };
            }
        }
    }
    
    /**
     * Update the "Time today" pie chart stat
     * @param {Object} jsonObject - Storage object
     * @param {Object} baseline - Baseline settings
     * @returns {boolean} - Whether stat has displayable value
     */
    function updateTimeTodayStat(jsonObject, baseline) {
        var isDecreaseHabit = baseline.decreaseHabit;
        var chartElement = isDecreaseHabit ? '#brief-wait-chart' : '#brief-time-chart';
        var $stat = isDecreaseHabit ? $('.stat-brief.stat-time-today.do-less-only') : $('.stat-brief.stat-time-today.do-more-only');
        
        // Only show if valuesTime is set
        if (!baseline.valuesTime) {
            $stat.addClass('d-none');
            return false;
        }
        
        // Calculate time spent today
        var now = Math.round(new Date() / 1000);
        var todayStart = getStartOfDay(now);
        
        var timedToday = 0;
        var waitedToday = 0;
        
        (jsonObject.action || []).forEach(function(action) {
            if (!action || parseInt(action.timestamp) < todayStart) return;
            
            if (action.clickType === 'timed' && action.duration) {
                timedToday += parseInt(action.duration) || 0;
            }
            
            if ((action.clickType === 'wait' || action.clickType === 'goal') && action.status >= 2) {
                var start = parseInt(action.clickStamp || action.timestamp);
                var end = parseInt(action.waitStopped || action.goalStopped || action.timestamp);
                waitedToday += Math.max(0, end - start);
            }
        });
        
        var relevantTime = isDecreaseHabit ? waitedToday : timedToday;
        
        // Only show if there's time recorded
        if (relevantTime === 0) {
            $stat.addClass('d-none');
            return false;
        }
        
        // Get goal time or use max as baseline
        var goalSeconds = getGoalTimeForToday(jsonObject, baseline);
        
        // Calculate percentage (cap at 100%)
        var percentage = goalSeconds > 0 ? Math.min(100, (relevantTime / goalSeconds) * 100) : 0;
        
        // Render pie chart
        renderMiniPieChart(chartElement, percentage, isDecreaseHabit);
        $stat.removeClass('d-none');
        return true;
    }
    
    /**
     * Update the "Did / Didn't" pie chart stat (do-less only)
     * @param {Object} jsonObject - Storage object
     * @returns {boolean} - Whether stat has displayable value
     */
    function updateDidDidntStat(jsonObject) {
        var $stat = $('.stat-brief.stat-did-didnt');
        var baseline = jsonObject.baseline || {};
        
        // Only for do-less habits with times-done tracking
        if (!baseline.decreaseHabit || !baseline.valuesTimesDone) {
            $stat.addClass('d-none');
            return false;
        }
        
        // Count uses and resists
        var uses = 0;
        var resists = 0;
        
        (jsonObject.action || []).forEach(function(action) {
            if (!action) return;
            if (action.clickType === 'used') uses++;
            if (action.clickType === 'craved') resists++;
        });
        
        var total = uses + resists;
        
        // Only show if there's data
        if (total === 0) {
            $stat.addClass('d-none');
            return false;
        }
        
        // Calculate resist percentage (green portion)
        var resistPercent = Math.round((resists / total) * 100);
        
        // Render pie chart - show resisted portion as "good" (green)
        renderDidDidntPieChart('#brief-did-didnt-chart', resistPercent, uses, resists);
        $stat.removeClass('d-none');
        return true;
    }
    
    /**
     * Render the did/didn't pie chart
     * @param {string} selector - Element selector
     * @param {number} resistPercent - Percentage resisted (green)
     * @param {number} uses - Number of uses
     * @param {number} resists - Number of resists
     */
    function renderDidDidntPieChart(selector, resistPercent, uses, resists) {
        var $el = $(selector);
        var greenColor = '#1e9039';
        var redColor = '#911521';
        var bgColor = 'rgba(255, 255, 255, 0.1)';
        
        // Use conic gradient - green for resists, red for uses
        var gradient = 'conic-gradient(' + 
            greenColor + ' 0% ' + resistPercent + '%, ' + 
            redColor + ' ' + resistPercent + '% 100%)';
        
        $el.css({
            'background': gradient,
            'border-radius': '50%'
        });
        
        // Show ratio in center
        $el.html('<span class="pie-ratio">' + resists + '/' + (uses + resists) + '</span>');
    }
    
    /**
     * Get start of day timestamp
     * @param {number} timestamp - Current timestamp
     * @returns {number} - Start of day timestamp
     */
    function getStartOfDay(timestamp) {
        var date = new Date(timestamp * 1000);
        date.setHours(0, 0, 0, 0);
        return Math.round(date.getTime() / 1000);
    }
    
    /**
     * Get goal time for today based on weekly goal
     * @param {Object} jsonObject - Storage object
     * @param {Object} baseline - Baseline settings
     * @returns {number} - Goal time in seconds
     */
    function getGoalTimeForToday(jsonObject, baseline) {
        // If no explicit goal, use the max daily time from history
        var maxDailyTime = getMaxDailyTime(jsonObject);
        
        // Default to 1 hour if no data
        if (maxDailyTime === 0) {
            maxDailyTime = 3600;
        }
        
        return maxDailyTime;
    }
    
    /**
     * Get the maximum time spent in any single day
     * @param {Object} jsonObject - Storage object
     * @returns {number} - Max time in seconds
     */
    function getMaxDailyTime(jsonObject) {
        var dailyTotals = {};
        
        (jsonObject.action || []).forEach(function(action) {
            if (!action) return;
            
            var dayKey = new Date(parseInt(action.timestamp) * 1000).toDateString();
            
            if (action.clickType === 'timed' && action.duration) {
                dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + (parseInt(action.duration) || 0);
            }
            
            if ((action.clickType === 'wait' || action.clickType === 'goal') && action.status >= 2) {
                var start = parseInt(action.clickStamp || action.timestamp);
                var end = parseInt(action.waitStopped || action.goalStopped || action.timestamp);
                dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + Math.max(0, end - start);
            }
        });
        
        var max = 0;
        for (var day in dailyTotals) {
            if (dailyTotals[day] > max) {
                max = dailyTotals[day];
            }
        }
        
        return max;
    }
    
    /**
     * Render a mini pie chart using CSS
     * @param {string} selector - Element selector
     * @param {number} percentage - Fill percentage
     * @param {boolean} isDecreaseHabit - Habit direction
     */
    function renderMiniPieChart(selector, percentage, isDecreaseHabit) {
        var $el = $(selector);
        var color = isDecreaseHabit ? '#1e9039' : '#6b96c1';
        var bgColor = 'rgba(255, 255, 255, 0.1)';
        
        // Use conic gradient for pie chart
        var gradient = 'conic-gradient(' + 
            color + ' 0% ' + percentage + '%, ' + 
            bgColor + ' ' + percentage + '% 100%)';
        
        $el.css({
            'background': gradient,
            'border-radius': '50%'
        });
        
        // Add percentage text in center
        $el.html('<span class="pie-percentage">' + Math.round(percentage) + '%</span>');
    }
    
    /**
     * Update the resist streak stat
     * @param {Object} jsonObject - Storage object
     * @returns {boolean} - Whether stat has displayable value
     */
    function updateResistStreakStat(jsonObject) {
        var $stat = $('.stat-brief.stat-resist-streak');
        var baseline = jsonObject.baseline || {};
        
        // Only for do-less habits with times-done tracking
        if (!baseline.decreaseHabit || !baseline.valuesTimesDone) {
            $stat.addClass('d-none');
            return false;
        }
        
        var streak = 0;
        var actions = (jsonObject.action || []).filter(function(a) {
            return a && (a.clickType === 'used' || a.clickType === 'craved');
        });
        
        // Sort by timestamp descending
        actions.sort(function(a, b) {
            return parseInt(b.timestamp) - parseInt(a.timestamp);
        });
        
        // Count consecutive resists from most recent
        for (var i = 0; i < actions.length; i++) {
            if (actions[i].clickType === 'craved') {
                streak++;
            } else {
                break;
            }
        }
        
        // Only show if there's a streak
        if (streak === 0) {
            $stat.addClass('d-none');
            return false;
        }
        
        $('#brief-resist-streak').text(streak);
        $stat.removeClass('d-none');
        return true;
    }
    
    /**
     * Refresh stats (call this after any action)
     */
    function refresh() {
        updateAllStats();
    }
    
    // Public API
    return {
        init: init,
        show: show,
        hide: hide,
        refresh: refresh,
        updateAllStats: updateAllStats,
        calculateNextMilestone: calculateNextMilestone
    };
})();

// Make the module available globally (also keep old name for compatibility)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BriefStatsModule;
} else {
    window.BriefStatsModule = BriefStatsModule;
}
