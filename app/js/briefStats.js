/**
 * BriefStatsModule - Quick summary stats bar
 * Shows key metrics at a glance in a compact bar format
 * 
 * Stat 1 (Left side - Fibonacci timer):
 * - "since last done" (focusTimesDone or focusTimeSpent)
 * - "since last spent" (focusMoneySpent)
 * 
 * Stat 2 (Right side - Comparison stat):
 * - [stat vs best/avg] comparisons when no goal is set
 * - [milestone] date/time targets when goal is set (future implementation)
 */
var BriefStatsModule = (function () {
    var json;
    
    /**
     * Initialize the module with app state
     * @param {Object} appJson - App state object
     */
    function init(appJson) {
        json = appJson;
        if (StorageModule.hasStorageData()) {
            updateAllStats();
        }

        // Add click handler for milestone stat to navigate to goals pane
        setupMilestoneClickHandler();
    }

    /**
     * Set up click handler for milestone stat (Wait until / Do it by)
     * Clicking navigates to the goals tab
     */
    function setupMilestoneClickHandler() {
        $(document).on('click', '.stat-brief.stat-milestone', function(e) {
            e.preventDefault();
            // Navigate to goals tab
            $('.goals-tab-toggler').first().click();
        });
    }
    
    /**
     * Show the brief stats bar (and its wrapper)
     */
    function show() {
        $('#brief-stats').removeClass('d-none');
        $('.brief-stats-container-wrapper').removeClass('d-none');
    }
    
    /**
     * Hide the brief stats bar (and its wrapper)
     */
    function hide() {
        $('#brief-stats').addClass('d-none');
        $('.brief-stats-container-wrapper').addClass('d-none');
    }
    
    /**
     * Update all stats in the bar
     */
    function updateAllStats() {
        console.group('[BriefStats] updateAllStats');
        
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject) {
            console.log('No storage data - hiding brief stats');
            console.groupEnd();
            hide();
            return;
        }
        
        var baseline = (jsonObject.option && jsonObject.option.baseline) || {};
        var actions = jsonObject.action || [];
        
        // REQUIREMENT: Timer must be started (at least one 'used' or 'bought' action)
        // before the brief-stats bar can display
        var hasStartedTimer = hasTimerStarted(actions, baseline);
        if (!hasStartedTimer) {
            console.log('Timer not started yet - hiding brief stats');
            console.groupEnd();
            hide();
            return;
        }
        
        var focus = determineFocus(baseline);
        var doLess = isDoLess(baseline);
        var doMore = isDoMore(baseline);

        // Log conditions for debugging
        console.log('CONDITIONS:', {
            focus: focus,
            doLess: doLess,
            doMore: doMore,
            hasStartedTimer: hasStartedTimer,
            hasBaselineTimesDone: hasBaselineTimesDone(baseline),
            hasBaselineTimeSpent: hasBaselineTimeSpent(baseline),
            hasBaselineMoneySpent: hasBaselineMoneySpent(baseline),
            hasGoalTimesDone: hasGoalTimesDone(jsonObject),
            hasGoalTimeSpent: hasGoalTimeSpent(jsonObject),
            hasGoalMoneySpent: hasGoalMoneySpent(jsonObject)
        });
        
        // Track which stats are visible
        var visibleStats = [];
        
        // Reset d-none on all stats before recalculating
        $('.stat-brief').addClass('d-none');
        
        // Stat 1: Fibonacci timer (last done OR last spent based on focus)
        var fibonacciTimerVisible = updateFibonacciTimerStat(jsonObject, baseline, actions);
        if (fibonacciTimerVisible) visibleStats.push('fibonacci-timer');
        console.log('Stat 1 (Fibonacci):', fibonacciTimerVisible ? 'VISIBLE' : 'hidden');
        
        // Stat 2: Comparison stat (based on conditions from brief-stats-logic.txt)
        var comparisonStatVisible = updateComparisonStat(jsonObject, baseline, actions);
        if (comparisonStatVisible) visibleStats.push('comparison');
        console.log('Stat 2 (Comparison):', comparisonStatVisible ? 'VISIBLE' : 'hidden');
        
        // Show/hide the bar based on whether we have any stats to display
        if (visibleStats.length > 0) {
            show();
            updateStatSizeClass(visibleStats.length);
        } else {
            hide();
        }
        
        console.log('Visible stats:', visibleStats);
        console.groupEnd();
    }
    
    /**
     * Check if the timer has been started (at least one relevant action exists)
     * For timesDone/timeSpent focus: needs 'used' or 'timed' action
     * For moneySpent focus: needs 'bought' action
     * @param {Array} actions - Array of actions
     * @param {Object} baseline - Baseline settings
     * @returns {boolean}
     */
    function hasTimerStarted(actions, baseline) {
        if (!actions || actions.length === 0) return false;
        
        var focus = determineFocus(baseline);
        
        if (focus === 'moneySpent') {
            // For money focus, need at least one 'bought' action
            return actions.some(function(a) {
                return a && a.clickType === 'bought';
            });
        } else if (focus === 'timesDone' || focus === 'timeSpent') {
            // For usage/time focus, need at least one 'used' or 'timed' action
            return actions.some(function(a) {
                return a && (a.clickType === 'used' || a.clickType === 'timed');
            });
        }
        
        // For neutral/wellness, check for any action
        return actions.some(function(a) {
            return a && (a.clickType === 'used' || a.clickType === 'bought' || a.clickType === 'timed');
        });
    }
    
    /**
     * Update size class on container based on visible stat count
     * @param {number} count - Number of visible stats
     */
    function updateStatSizeClass(count) {
        var $container = $('.brief-stats-container');
        $container.removeClass('stats-count-1 stats-count-2 stats-count-3');
        $container.addClass('stats-count-' + Math.min(count, 3));
    }
    
    // ============================================
    // Condition Checking Functions
    // ============================================
    
    /**
     * Determine user's primary focus based on baseline selections
     * Priority: timesDone > timeSpent > moneySpent > wellness > neutral
     * @param {Object} baseline - Baseline settings
     * @returns {string} - 'timesDone' | 'timeSpent' | 'moneySpent' | 'wellness' | 'neutral'
     */
    function determineFocus(baseline) {
        if (baseline.valuesTimesDone) return 'timesDone';
        if (baseline.valuesTime) return 'timeSpent';
        if (baseline.valuesMoney) return 'moneySpent';
        if (baseline.valuesHealth) return 'wellness';
        return 'neutral';
    }
    
    /**
     * Check if user is in "do less" mode
     * @param {Object} baseline - Baseline settings
     * @returns {boolean}
     */
    function isDoLess(baseline) {
        return baseline.doLess === true;
    }
    
    /**
     * Check if user is in "do more" mode
     * @param {Object} baseline - Baseline settings
     * @returns {boolean}
     */
    function isDoMore(baseline) {
        return baseline.doMore === true;
    }
    
    /**
     * Check if user has baseline value for times done
     * @param {Object} baseline - Baseline settings
     * @returns {boolean}
     */
    function hasBaselineTimesDone(baseline) {
        return (parseInt(baseline.timesDone) || 0) > 0;
    }
    
    /**
     * Check if user has baseline value for time spent
     * @param {Object} baseline - Baseline settings
     * @returns {boolean}
     */
    function hasBaselineTimeSpent(baseline) {
        var hours = parseInt(baseline.timeSpentHours) || 0;
        var minutes = parseInt(baseline.timeSpentMinutes) || 0;
        return (hours > 0 || minutes > 0);
    }
    
    /**
     * Check if user has baseline value for money spent
     * @param {Object} baseline - Baseline settings
     * @returns {boolean}
     */
    function hasBaselineMoneySpent(baseline) {
        return (parseFloat(baseline.moneySpent) || 0) > 0;
    }
    
    /**
     * Check if user has a goal for times done
     * @param {Object} jsonObject - Storage object
     * @returns {boolean}
     */
    function hasGoalTimesDone(jsonObject) {
        var goals = jsonObject.behavioralGoals || [];
        return goals.some(function(g) {
            return g.status === 'active' && g.type === 'quantitative' && g.unit === 'times';
        });
    }
    
    /**
     * Check if user has a goal for time spent
     * @param {Object} jsonObject - Storage object
     * @returns {boolean}
     */
    function hasGoalTimeSpent(jsonObject) {
        var goals = jsonObject.behavioralGoals || [];
        return goals.some(function(g) {
            return g.status === 'active' && g.type === 'quantitative' && g.unit === 'minutes';
        });
    }
    
    /**
     * Check if user has a goal for money spent
     * @param {Object} jsonObject - Storage object
     * @returns {boolean}
     */
    function hasGoalMoneySpent(jsonObject) {
        var goals = jsonObject.behavioralGoals || [];
        return goals.some(function(g) {
            return g.status === 'active' && g.type === 'quantitative' && g.unit === 'dollars';
        });
    }
    
    // ============================================
    // Stat 1: Fibonacci Timer Functions
    // ============================================
    
    // ============================================
    // doLess: Wait vs Best Helpers
    // ============================================

    /** Current active wait duration in seconds (or most recent completed if no active wait) */
    function getCurrentWaitDuration(actions) {
        var nowSec = Math.round(Date.now() / 1000);
        var activeWaits = actions.filter(function(a) {
            return a && a.clickType === 'wait' && a.status === 1;
        });
        if (activeWaits.length > 0) {
            var most = activeWaits[activeWaits.length - 1];
            return nowSec - parseInt(most.timestamp);
        }
        var completedWaits = actions.filter(function(a) {
            return a && a.clickType === 'wait' && (a.status === 2 || a.status === 3) && a.waitStopped;
        });
        if (completedWaits.length === 0) return 0;
        var most = completedWaits[completedWaits.length - 1];
        return (most.waitStopped || most.waitStamp) - parseInt(most.timestamp);
    }

    /** Longest completed wait duration in seconds */
    function getLongestWaitDuration(actions) {
        var completedWaits = actions.filter(function(a) {
            return a && a.clickType === 'wait' && (a.status === 2 || a.status === 3) && a.waitStopped;
        });
        if (completedWaits.length === 0) return 0;
        var longest = 0;
        completedWaits.forEach(function(w) {
            var dur = w.waitStopped - parseInt(w.timestamp);
            if (dur > longest) longest = dur;
        });
        return longest;
    }

    // ============================================
    // Stat 1: Fibonacci Timer Functions
    // ============================================

    /**
     * Update fibonacci timer stat based on focus
     * @param {Object} baseline - Baseline settings
     * @param {Array} actions - Array of actions
     * @returns {boolean} - Whether a fibonacci timer is visible
     */
    function updateFibonacciTimerStat(jsonObject, baseline, actions) {
        var focus = determineFocus(baseline);
        var doMore = isDoMore(baseline);
        
        if (focus === 'timesDone' || focus === 'timeSpent') {
            if (doMore) {
                return updateDoBeforeStat(jsonObject);
            }
            return updateLastDoneStat();
        } else if (focus === 'moneySpent') {
            return updateLastSpentStat();
        }

        // No focus - hide both timers
        $('.stat-brief.stat-last-done').addClass('d-none');
        $('.stat-brief.stat-last-spent').addClass('d-none');
        return false;
    }

    /**
     * Seconds until the next session is due to keep a steady habit (doMore mode).
     * Entries close together count as one session, so logging pushups then
     * situps doesn't shrink the deadline to seconds. The pace comes from the
     * active goal's current step, else the user's recent rhythm, else baseline.
     * Returns null if there's nothing to go on; negative if already overdue.
     * @param {Object} jsonObject - Storage object
     * @returns {number|null}
     */
    function getDoBeforeSeconds(jsonObject) {
        var Calc = StatsCalculationsModule;
        var baseline = (jsonObject.option && jsonObject.option.baseline) || {};
        var goals = jsonObject.behavioralGoals || [];
        var goal = Calc.getActiveGoalForUnit(goals, 'times') || Calc.getActiveGoalForUnit(goals, 'minutes');
        var nowSeconds = Math.floor(Date.now() / 1000);

        var doBefore = Calc.getDoBeforeTimestamp(jsonObject.action || [], baseline, goal, nowSeconds);
        return doBefore === null ? null : doBefore - nowSeconds;
    }

    /**
     * Show the "Do Before" countdown/ASAP display (doMore mode).
     * Starts the countdown via TimerStateManager, or shows ASAP if the interval elapsed.
     * Falls back to "Last done" label when fewer than 2 actions exist.
     * @param {Array} actions - Array of actions
     * @returns {boolean} - Always true
     */
    function updateDoBeforeStat(jsonObject) {
        var $stat = $('.stat-brief.stat-last-done');
        $stat.removeClass('d-none');
        $('.stat-brief.stat-last-spent').addClass('d-none');

        var doBeforeSeconds = getDoBeforeSeconds(jsonObject);

        if (doBeforeSeconds === null) {
            // Not enough actions yet — show normal "Last done" countup
            $stat.find('.stat-brief-label').text('Last done');
            $stat.find('.timer-recepticle').show();
            $stat.find('.do-before-asap').addClass('d-none');
            return true;
        }

        $stat.find('.stat-brief-label').text('Do Before');

        if (typeof TimerStateManager !== 'undefined' && TimerStateManager.startDoBeforeCountdown) {
            TimerStateManager.startDoBeforeCountdown(doBeforeSeconds);
        }

        return true;
    }
    
    /**
     * Show the "Last done" fibonacci timer
     * @returns {boolean} - Always true
     */
    function updateLastDoneStat() {
        var $stat = $('.stat-brief.stat-last-done');
        $stat.find('.stat-brief-label').text('Last done');
        $stat.removeClass('d-none');
        $stat.find('.stat-brief-label').text('Last done');
        $stat.find('.timer-recepticle').show();
        $stat.find('.do-before-asap').addClass('d-none');
        $('.stat-brief.stat-last-spent').addClass('d-none');
        return true;
    }

    /**
     * Show the "Last spent" fibonacci timer
     * @returns {boolean} - Always true
     */
    function updateLastSpentStat() {
        var $stat = $('.stat-brief.stat-last-spent');
        $stat.removeClass('d-none');
        $('.stat-brief.stat-last-done').addClass('d-none');
        return true;
    }
    
    // ============================================
    // Stat 2: Comparison Stat Functions
    // ============================================
    
    /**
     * Determine which comparison stat to show based on conditions
     * Returns null if no stat should be shown, or object with stat type and data
     * Priority: milestone stats (when goal exists) > comparison stats
     * @param {Object} jsonObject - Storage object
     * @param {Object} baseline - Baseline settings
     * @param {Array} actions - Array of actions
     * @returns {Object|null} - Stat configuration or null
     */
    function determineComparisonStat(jsonObject, baseline, actions) {
        var focus = determineFocus(baseline);
        var doLess = isDoLess(baseline);
        var doMore = isDoMore(baseline);
        
        // Base case: no focus = no stat 2
        if (focus === 'neutral' || focus === 'wellness') {
            console.log('[BriefStats] Stat 2 decision: NONE (focus is neutral/wellness)');
            return null;
        }
        
        // Get timeline setting for the focus area
        var timeline = getTimelineForFocus(focus, baseline);
        var Calc = StatsCalculationsModule;
        var behavioralGoals = jsonObject.behavioralGoals || [];
        
        // Check for goals first - milestone stats take priority
        // Milestones require BOTH hasBaseline AND hasGoal
        if (focus === 'timesDone' && hasBaselineTimesDone(baseline) && hasGoalTimesDone(jsonObject)) {
            var goal = Calc.getActiveGoalForUnit(behavioralGoals, 'times');
            var milestone = getNextScheduledMilestone(goal, actions, doLess);
            if (milestone && !milestone.complete) {
                return getMilestoneStatConfig(milestone, doLess);
            }
        }
        if (focus === 'timeSpent' && hasBaselineTimeSpent(baseline) && hasGoalTimeSpent(jsonObject)) {
            var goal = Calc.getActiveGoalForUnit(behavioralGoals, 'minutes');
            // For time spent, show allotment status (current vs allotted)
            var allotment = Calc.getTimeAllotmentStatus(goal, actions);
            if (allotment) {
                return getTimeAllotmentStatConfig(allotment, doLess);
            }
        }
        if (focus === 'moneySpent' && hasBaselineMoneySpent(baseline) && hasGoalMoneySpent(jsonObject)) {
            var goal = Calc.getActiveGoalForUnit(behavioralGoals, 'dollars');
            // For money spent, show allotment status (spent vs allotted)
            var allotment = Calc.getTimeAllotmentStatus(goal, actions);
            if (allotment) {
                return getMoneyAllotmentStatConfig(allotment, doLess);
            }
        }
        
        // Fall back to comparison stat based on focus, baseline, and habit direction
        var result = null;
        if (focus === 'timesDone') {
            result = getTimesDoneComparisonStat(baseline, actions, doLess, doMore, timeline);
        } else if (focus === 'timeSpent') {
            result = getTimeSpentComparisonStat(baseline, actions, doLess, doMore, timeline);
        } else if (focus === 'moneySpent') {
            result = getMoneySpentComparisonStat(baseline, actions, doLess, doMore, timeline);
        }
        
        if (result) {
            console.log('[BriefStats] Stat 2 decision: COMPARISON (' + result.label + ')', result);
        } else {
            console.log('[BriefStats] Stat 2 decision: NONE (no matching condition)');
        }
        
        return result;
    }
    
    /**
     * Get next scheduled milestone from the goal's milestone schedule.
     * This uses the same schedule that's displayed in the goals panel,
     * ensuring consistency between the brief stat and the milestones list.
     * 
     * @param {Object} goal - Behavioral goal object
     * @param {Array} actions - Array of user actions
     * @param {boolean} doLess - Whether this is a "do less" habit
     * @returns {Object|null} - Milestone config or null if complete
     */
    function getNextScheduledMilestone(goal, actions, doLess) {
        if (!goal) return null;

        var result = GoalMilestonesModule.generateScheduleMilestones(goal, actions, doLess);
        if (result.originalTotal === 0) return null;

        if (!result.next) {
            return { complete: true, totalMilestones: result.originalTotal, actualCount: result.actionUnits };
        }

        return {
            type: doLess ? 'waitUntil' : 'doItBy',
            timestamp: result.next.timestamp,
            availableNow: result.next.availableNow,
            actualCount: result.actionUnits,
            milestonesPassedCount: result.passedCount,
            totalMilestones: result.originalTotal,
            trackStatus: result.track.status,
            onTrack: result.track.status !== 'behind',
            isAhead: result.track.status === 'ahead',
            milestoneIndex: result.next.index
        };
    }

    /**
     * Get stat config for milestone (Wait until / Do it by)
     * @param {Object} milestone - Milestone data from getNextScheduledMilestone
     * @param {boolean} doLess - Whether this is a "do less" habit
     * @returns {Object} - Stat configuration
     */
    function getMilestoneStatConfig(milestone, doLess) {
        var Calc = StatsCalculationsModule;
        
        // Build status label based on tracking
        var milestoneInfo = '';
        if (milestone.milestoneIndex && milestone.totalMilestones) {
            milestoneInfo = ' (' + milestone.milestoneIndex + '/' + milestone.totalMilestones + ')';
        }
        
        if (milestone.type === 'waitUntil') {
            return {
                type: 'milestone',
                subtype: 'waitUntil',
                label: milestone.availableNow ? 'Allowed' : 'Wait until',
                value: milestone.availableNow ? 'Now' : Calc.formatMilestoneClockTime(milestone.timestamp),
                countdown: milestone.availableNow ? '' : Calc.formatMilestoneTime(milestone.timestamp),
                format: 'datetime',
                onTrack: milestone.onTrack,
                isAhead: milestone.isAhead,
                trackStatus: milestone.trackStatus,
                milestoneInfo: milestoneInfo
            };
        } else if (milestone.type === 'doItBy') {
            return {
                type: 'milestone',
                subtype: 'doItBy',
                label: 'Do it by',
                value: Calc.formatMilestoneClockTime(milestone.timestamp),
                countdown: Calc.formatMilestoneTime(milestone.timestamp),
                format: 'datetime',
                onTrack: milestone.onTrack,
                isAhead: milestone.isAhead,
                trackStatus: milestone.trackStatus,
                milestoneInfo: milestoneInfo
            };
        }
        
        return null;
    }
    
    /**
     * Get stat config for time allotment (time spent today vs allotted)
     * Per logic: [milestone: amount of time] time spent today VS. allotted time / day
     * @param {Object} allotment - {current, allotted, unit}
     * @param {boolean} doLess - Whether this is a "do less" habit
     * @returns {Object} - Stat configuration
     */
    function getTimeAllotmentStatConfig(allotment, doLess) {
        return {
            type: 'milestone',
            subtype: 'timeAllotment',
            label: 'Time vs allotted',
            current: allotment.current,
            comparison: allotment.allotted,
            format: 'timeMinutes'
        };
    }
    
    /**
     * Get stat config for money allotment (spent today vs allotted)
     * Per logic: [milestone: number] Spent today vs allotted spend / day
     * @param {Object} allotment - {current, allotted, unit}
     * @param {boolean} doLess - Whether this is a "do less" habit
     * @returns {Object} - Stat configuration
     */
    function getMoneyAllotmentStatConfig(allotment, doLess) {
        return {
            type: 'milestone',
            subtype: 'moneyAllotment',
            label: 'Spent vs allotted',
            current: allotment.current,
            comparison: allotment.allotted,
            format: 'money'
        };
    }
    
    /**
     * Get timeline setting for a focus area
     * @param {string} focus - Focus type
     * @param {Object} baseline - Baseline settings
     * @returns {string} - 'day', 'week', or 'month'
     */
    function getTimelineForFocus(focus, baseline) {
        if (focus === 'timesDone') {
            return baseline.usageTimeline || 'week';
        } else if (focus === 'timeSpent') {
            return baseline.timeTimeline || 'week';
        } else if (focus === 'moneySpent') {
            return baseline.spendingTimeline || 'week';
        }
        return 'day';
    }
    
    /**
     * Get comparison stat for timesDone focus
     */
    function getTimesDoneComparisonStat(baseline, actions, doLess, doMore, timeline) {
        var hasBaseline = hasBaselineTimesDone(baseline);
        var Calc = StatsCalculationsModule;
        
        console.log('[BriefStats] getTimesDoneComparisonStat:', { doLess, doMore, hasBaseline, timeline });
        
        if (doLess) {
            // streak: resists VS. longest streak
            var currentStreak = Calc.getCurrentResistStreak(actions);
            var longestStreak = Calc.calculateResistStreak(actions);
            console.log('[BriefStats] → doLess + noBaseline: Streak', { currentStreak, longestStreak });
            return {
                type: 'statVsBest',
                statLabel: 'Resist streak',
                currLabel: 'Current',
                vsLabel: 'Best',
                current: currentStreak,
                comparison: longestStreak,
                format: 'number',
                doLess: doLess
            };
            
        } else if (doMore) {
            if (hasBaseline) {
                // done this day/week/month vs baseline for the same period
                // (comparing per day would round a 3/week baseline down to 0)
                var current = Calc.getCountForPeriod(actions, timeline);
                return {
                    type: 'statVsBest',
                    statLabel: 'Done vs start',
                    currLabel: { day: 'Today', week: 'Week', month: 'Month' }[timeline] || 'Week',
                    vsLabel: 'Base',
                    current: current,
                    comparison: parseFloat(baseline.timesDone) || 0,
                    format: 'number',
                    doLess: !doMore
                };
            } else {
                // times done today vs average done / day
                var current = Calc.getCountForPeriod(actions, 'day');
                var avgPerDay = Calc.getAverageCountPerDay(actions);
                console.log('[BriefStats] → doMore + noBaseline: Today vs avg', { current, avgPerDay });
                return {
                    type: 'statVsAvg',
                    statLabel: 'Done per day',
                    currLabel: 'Today',
                    vsLabel: 'Avg',
                    current: current,
                    comparison: avgPerDay,
                    format: 'number',
                    doLess: !doMore
                };
            }
        } else {
            // Neutral habit direction - show streak by default
            var currentStreak = Calc.getCurrentResistStreak(actions);
            var longestStreak = Calc.calculateResistStreak(actions);
            console.log('[BriefStats] → neutral: Streak fallback', { currentStreak, longestStreak });
            if (longestStreak > 0) {
                return {
                    type: 'statVsBest',
                    statLabel: 'Resist streak',
                    currLabel: 'Current',
                    vsLabel: 'Best',
                    current: currentStreak,
                    comparison: longestStreak,
                    format: 'number',
                    doLess: true // neutral assumes do less
                };
            }
        }
        
        return null;
    }
    
    /**
     * Get comparison stat for timeSpent focus
     */
    function getTimeSpentComparisonStat(baseline, actions, doLess, doMore, timeline) {
        var hasBaseline = hasBaselineTimeSpent(baseline);
        var Calc = StatsCalculationsModule;
        
        console.log('[BriefStats] getTimeSpentComparisonStat:', { doLess, doMore, hasBaseline, timeline });
        
        if (doLess) {
            if (hasBaseline) {
                // time spent today vs baseline time spent / day
                var current = Calc.getTimeSpentForPeriod(actions, 'day');
                var baselineHours = parseInt(baseline.timeSpentHours) || 0;
                var baselineMinutes = parseInt(baseline.timeSpentMinutes) || 0;
                var baselineSeconds = (baselineHours * 3600) + (baselineMinutes * 60);
                var baselinePerDay = Calc.baselineToPerDay(baselineSeconds, timeline);
                console.log('[BriefStats] → doLess + hasBaseline: Today vs baseline (time)', { current, baselinePerDay });
                return {
                    type: 'statVsAvg',
                    statLabel: 'Time spent',
                    currLabel: 'Today',
                    vsLabel: 'Base',
                    current: current,
                    comparison: Math.round(baselinePerDay),
                    format: 'time',
                    doLess: doLess
                };
            } else {
                // time waited (current) vs best wait ever
                var currentWait = getCurrentWaitDuration(actions);
                var longestWait = getLongestWaitDuration(actions);
                console.log('[BriefStats] → doLess + noBaseline + timeSpent: Wait vs best', { currentWait, longestWait });
                if (currentWait > 0 || longestWait > 0) {
                    return {
                        type: 'statVsBest',
                        statLabel: 'Time waited',
                        currLabel: 'Current',
                        vsLabel: 'Best',
                        current: currentWait,
                        comparison: longestWait,
                        format: 'time',
                        doLess: doLess
                    };
                }
                return null;
            }
        } else if (doMore) {
            if (hasBaseline) {
                // time spent today vs baseline time spent / day
                var current = Calc.getTimeSpentForPeriod(actions, 'day');
                var baselineHours = parseInt(baseline.timeSpentHours) || 0;
                var baselineMinutes = parseInt(baseline.timeSpentMinutes) || 0;
                var baselineSeconds = (baselineHours * 3600) + (baselineMinutes * 60);
                var baselinePerDay = Calc.baselineToPerDay(baselineSeconds, timeline);
                console.log('[BriefStats] → doMore + hasBaseline: Today vs baseline (time)', { current, baselinePerDay });
                return {
                    type: 'statVsBest',
                    statLabel: 'Time Spent',
                    currLabel: 'Today',
                    vsLabel: 'Base',
                    current: current,
                    comparison: Math.round(baselinePerDay),
                    format: 'time',
                    doLess: !doMore
                };
            } else {
                // time spent today vs best time spent / day
                var current = Calc.getTimeSpentForPeriod(actions, 'day');
                var bestPerDay = Calc.getBestTimePerDay(actions);
                console.log('[BriefStats] → doMore + noBaseline: Today vs best (time)', { current, bestPerDay });
                return {
                    type: 'statVsBest',
                    label: 'Today vs best',
                    statLabel: 'Time Spent',
                    currLabel: 'Today',
                    vsLabel: 'Best',
                    current: current,
                    comparison: bestPerDay,
                    format: 'time',
                    doLess: !doMore
                };
            }
        } else {
            // Neutral - show today vs best
            var current = Calc.getTimeSpentForPeriod(actions, 'day');
            var bestPerDay = Calc.getBestTimePerDay(actions);
            console.log('[BriefStats] → neutral: Today vs best fallback (time)', { current, bestPerDay });
            if (bestPerDay > 0) {
                return {
                    type: 'statVsBest',
                    label: 'Today vs best',
                    statLabel: 'Time Spent',
                    currLabel: 'Today',
                    vsLabel: 'Best',
                    current: current,
                    comparison: bestPerDay,
                    format: 'time',
                    doLess: true //neutral assumes do less
                };
            }
        }
        
        return null;
    }
    
    /**
     * Get comparison stat for moneySpent focus
     */
    function getMoneySpentComparisonStat(baseline, actions, doLess, doMore, timeline) {
        var hasBaseline = hasBaselineMoneySpent(baseline);
        var Calc = StatsCalculationsModule;
        
        console.log('[BriefStats] getMoneySpentComparisonStat:', { doLess, doMore, hasBaseline, timeline });
        
        if (doLess) {
            if (hasBaseline) {
                // money spent today vs baseline money spent / day
                var current = Calc.getAmountSpentForPeriod(actions, 'day');
                var baselinePerDay = Calc.baselineToPerDay(baseline.moneySpent, timeline);
                console.log('[BriefStats] → doLess + hasBaseline: Today vs baseline ($)', { current, baselinePerDay });
                return {
                    type: 'statVsAvg',
                    statLabel: 'Money Spent',
                    currLabel: 'Today',
                    vsLabel: 'Base',
                    current: Math.round(current),
                    comparison: Math.round(baselinePerDay),
                    format: 'money',
                    doLess: doLess
                };
            } else {
                // time waited (current) vs best wait ever
                var currentWait = getCurrentWaitDuration(actions);
                var longestWait = getLongestWaitDuration(actions);
                console.log('[BriefStats] → doLess + noBaseline + moneySpent: Wait vs best', { currentWait, longestWait });
                if (currentWait > 0 || longestWait > 0) {
                    return {
                        type: 'statVsBest',
                        statLabel: 'Time waited',
                        currLabel: 'Current',
                        vsLabel: 'Best',
                        current: currentWait,
                        comparison: longestWait,
                        format: 'time',
                        doLess: doLess
                    };
                }
                return null;
            }
        } else if (doMore) {
            if (hasBaseline) {
                // money spent today vs baseline money spent / day
                var current = Calc.getAmountSpentForPeriod(actions, 'day');
                var baselinePerDay = Calc.baselineToPerDay(baseline.moneySpent, timeline);
                console.log('[BriefStats] → doMore + hasBaseline: Today vs baseline ($)', { current, baselinePerDay });
                return {
                    type: 'statVsAvg',
                    statLabel: 'Money Invested',
                    currLabel: 'Today',
                    vsLabel: 'Base',
                    current: Math.round(current),
                    comparison: Math.round(baselinePerDay),
                    format: 'money',
                    doLess: !doMore
                };
            } else {
                // money spent today vs best money spent / day
                var current = Calc.getAmountSpentForPeriod(actions, 'day');
                var bestPerDay = Calc.getBestAmountPerDay(actions);
                console.log('[BriefStats] → doMore + noBaseline: Today vs best ($)', { current, bestPerDay });
                return {
                    type: 'statVsBest',
                    statLabel: 'Money Invested',
                    currLabel: 'Today',
                    vsLabel: 'Best',
                    current: Math.round(current),
                    comparison: Math.round(bestPerDay),
                    format: 'money',
                    doLess: !doMore
                };
            }
        } else {
            // Neutral - show today vs best
            var current = Calc.getAmountSpentForPeriod(actions, 'day');
            var bestPerDay = Calc.getBestAmountPerDay(actions);
            console.log('[BriefStats] → neutral: Today vs best fallback ($)', { current, bestPerDay });
            if (bestPerDay > 0) {
                return {
                    type: 'statVsBest',
                    label: 'Today vs best',
                    statLabel: 'Money Spent',
                    currLabel: 'Today',
                    vsLabel: 'Best',
                    current: Math.round(current),
                    comparison: Math.round(bestPerDay),
                    format: 'money',
                    doLess: true //neutral assumes do less
                };
            }
        }
        
        return null;
    }
    
    /**
     * Update the comparison stat display
     * Handles both comparison stats and milestone stats
     * @param {Object} jsonObject - Storage object
     * @param {Object} baseline - Baseline settings
     * @param {Array} actions - Array of actions
     * @returns {boolean} - Whether stat is visible
     */
    function updateComparisonStat(jsonObject, baseline, actions) {
        var statConfig = determineComparisonStat(jsonObject, baseline, actions);
        
        if (!statConfig) {
            $('.stat-brief.stat-comparison').addClass('d-none');
            $('.stat-brief.stat-milestone').addClass('d-none');
            return false;
        }
        
        // Handle milestone stats differently from comparison stats
        if (statConfig.type === 'milestone') {
            return updateMilestoneStat(statConfig);
        }
        
        // Hide milestone stat if showing comparison
        $('.stat-brief.stat-milestone').addClass('d-none');
        
        // Format the values based on format type
        var currentDisplay = formatStatValue(statConfig.current, statConfig.format);
        var comparisonDisplay = formatStatValue(statConfig.comparison, statConfig.format);
        
        // Update the DOM with new structure
        var $stat = $('.stat-brief.stat-comparison');
        // Values longer than 3 characters use a smaller font to fit the 75px box
        var sizeValue = function($el, text) {
            var length = String(text).length;
            $el.text(text).toggleClass('long-value', length > 3 && length <= 5).toggleClass('very-long-value', length > 5);
        };
        sizeValue($stat.find('.stat-current'), currentDisplay);
        sizeValue($stat.find('.stat-vs'), comparisonDisplay);
        $stat.find('.stat-label').text(statConfig.statLabel);
        $stat.find('.stat-current-label').text(statConfig.currLabel);
        $stat.find('.stat-vs-label').text(statConfig.vsLabel);
        
        // Add type class for styling
        $stat.removeClass('stat-vs-best stat-vs-avg stat-stat-vs-best stat-stat-vs-avg stat-exceeds');
        $stat.addClass('stat-' + statConfig.type.replace(/([A-Z])/g, '-$1').toLowerCase());
        
        // Check if current exceeds the comparison (celebration!)
        var currentVal = parseFloat(statConfig.current) || 0;
        var comparisonVal = parseFloat(statConfig.comparison) || 0;
        if (currentVal > comparisonVal && comparisonVal > 0) {
            $stat.addClass('stat-exceeds');
            console.log('[BriefStats] 🎉 Current exceeds ' + statConfig.vsLabel + '!', { current: currentVal, comparison: comparisonVal });
        }
        
        $stat.removeClass('d-none');
        return true;
    }
    
    /**
     * Update milestone stat display
     * @param {Object} statConfig - Milestone stat configuration
     * @returns {boolean} - Whether stat is visible
     */
    function updateMilestoneStat(statConfig) {
        // Hide comparison stat if showing milestone
        $('.stat-brief.stat-comparison').addClass('d-none');
        
        var $stat = $('.stat-brief.stat-milestone');
        
        if (statConfig.format === 'datetime') {
            // Date/time milestone (Wait until / Do it by)
            $stat.find('.stat-milestone-time').text(statConfig.value);
            $stat.find('.stat-milestone-countdown').text(statConfig.countdown);
            
            // Build label with milestone info if available
            var labelText = statConfig.label;
            if (statConfig.milestoneInfo) {
                labelText += ' ' + statConfig.milestoneInfo;
            }
            $stat.find('.stat-label').text(labelText);
            
            // Show time display, hide comparison display
            $stat.find('.stat-milestone-datetime').removeClass('d-none');
            $stat.find('.stat-milestone-comparison').addClass('d-none');
        } else {
            // Comparison milestone (time/money allotment)
            var currentDisplay = formatStatValue(statConfig.current, statConfig.format);
            var comparisonDisplay = formatStatValue(statConfig.comparison, statConfig.format);
            
            $stat.find('.stat-current').text(currentDisplay);
            $stat.find('.stat-vs').text(comparisonDisplay);
            $stat.find('.stat-label').text(statConfig.label);
            
            // Show comparison display, hide time display
            $stat.find('.stat-milestone-datetime').addClass('d-none');
            $stat.find('.stat-milestone-comparison').removeClass('d-none');
        }
        
        // Add subtype class for styling
        $stat.removeClass('stat-wait-until stat-do-it-by stat-time-allotment stat-money-allotment');
        $stat.addClass('stat-' + statConfig.subtype.replace(/([A-Z])/g, '-$1').toLowerCase());
        
        // Add track status classes for styling
        // ahead = green, on-track = neutral, behind = red
        $stat.removeClass('milestone-on-track milestone-off-track milestone-ahead');
        if (statConfig.isAhead === true) {
            $stat.addClass('milestone-ahead');
        } else if (statConfig.onTrack === true) {
            $stat.addClass('milestone-on-track');
        } else if (statConfig.onTrack === false) {
            $stat.addClass('milestone-off-track');
        }
        
        $stat.removeClass('d-none');
        return true;
    }
    
    /**
     * Format a stat value based on its type
     * @param {number} value - The value to format
     * @param {string} format - 'number', 'time', 'money', or 'timeMinutes'
     * @returns {string} - Formatted string
     */
    function formatStatValue(value, format) {
        if (format === 'time') {
            return StatsCalculationsModule.formatDurationBrief(value);
        } else if (format === 'timeMinutes') {
            // Format minutes as hours:minutes
            var hours = Math.floor(value / 60);
            var mins = value % 60;
            if (hours > 0) {
                return hours + 'h ' + mins + 'm';
            }
            return mins + 'm';
        } else if (format === 'money') {
            return '$' + value;
        }
        return String(value);
    }
    
    /**
     * Override the smoke countup timer with the "Do Before" countdown for doMore users.
     * Called in app.js immediately after TimersModule.hideTimersOnLoad so the countdown
     * replaces the countup that hideTimersOnLoad just started.
     * No-op for non-doMore users or when there's no pace to go on yet.
     */
    function applyDoBeforeTimer() {
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject) return;

        var baseline = (jsonObject.option && jsonObject.option.baseline) || {};
        var actions = jsonObject.action || [];
        var focus = determineFocus(baseline);

        if (!isDoMore(baseline)) return;
        if (focus !== 'timesDone' && focus !== 'timeSpent') return;

        var doBeforeSeconds = getDoBeforeSeconds(jsonObject);
        if (doBeforeSeconds === null) return; // nothing to go on yet — leave the smoke countup running

        $('.stat-brief.stat-last-done .stat-brief-label').text('Do Before');
        if (typeof TimerStateManager !== 'undefined') {
            TimerStateManager.startDoBeforeCountdown(doBeforeSeconds);
        }
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
        determineFocus: determineFocus,
        determineComparisonStat: determineComparisonStat,
        getDoBeforeSeconds: getDoBeforeSeconds,
        applyDoBeforeTimer: applyDoBeforeTimer
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BriefStatsModule;
} else {
    window.BriefStatsModule = BriefStatsModule;
}
