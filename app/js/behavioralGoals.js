/**
 * BehavioralGoalsModule
 * Handles quantitative and qualitative behavioral goals
 * (distinct from the delayed gratification "wait" goals in GoalsModule)
 */
var BehavioralGoalsModule = (function () {
    // Private variables
    var json;
    
    // Cache for milestone data (keyed by goal ID)
    // This avoids encoding large data in DOM attributes
    var milestoneCache = {};

    /**
     * Generate a unique ID for behavioral goals
     */
    function generateBehavioralGoalId() {
        return 'bgoal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Convert timeline string to numeric days
     */
    function timelineToDays(timeline) {
        switch (timeline) {
            case 'day': return 1;
            case 'week': return 7;
            case 'month': return 30;
            case 'year': return 365;
            default: return 7;
        }
    }

    /**
     * Create a new quantitative behavioral goal
     * @param {string} unit - The unit of measurement (times, minutes, dollars)
     * @param {number} currentAmount - Current amount per measurement period
     * @param {number} goalAmount - Target amount per measurement period  
     * @param {number} measurementTimeline - Days in measurement period (1, 7, 30)
     * @param {number} completionTimeline - Days until goal completion target
     */
    function createQuantitativeGoal(unit, currentAmount, goalAmount, measurementTimeline, completionTimeline) {
        var behavioralGoal = {
            id: generateBehavioralGoalId(),
            type: 'quantitative',
            unit: unit,
            currentAmount: currentAmount,
            goalAmount: goalAmount,
            measurementTimeline: measurementTimeline,
            completionTimeline: completionTimeline,
            createdAt: Date.now(),
            status: 'active', // active, completed, abandoned
            progress: []  // Array of progress check-ins
        };
        
        return saveBehavioralGoal(behavioralGoal);
    }

    /**
     * Create a new qualitative behavioral goal
     * @param {string} tenetText - The wellness/health goal description
     * @param {number} completionTimeline - Days until goal completion target
     * @param {number} initialMood - Initial mood rating (0-4)
     * @param {string} initialComment - Initial comment about the goal
     */
    function createQualitativeGoal(tenetText, completionTimeline, initialMood, initialComment) {
        var behavioralGoal = {
            id: generateBehavioralGoalId(),
            type: 'qualitative',
            tenetText: tenetText,
            completionTimeline: completionTimeline,
            createdAt: Date.now(),
            status: 'active',
            // Qualitative goals don't have these, set to null for consistency
            unit: null,
            currentAmount: null,
            goalAmount: null,
            measurementTimeline: null,
            // Mood records will reference this goal via goalId in action table
            moodRecords: [] // References to action IDs for this goal
        };
        
        var savedGoal = saveBehavioralGoal(behavioralGoal);
        
        // Create initial mood record if provided
        if (savedGoal && (initialMood !== undefined || initialComment)) {
            createMoodRecordForBehavioralGoal(savedGoal.id, initialMood, initialComment);
        }
        
        return savedGoal;
    }

    /**
     * Save behavioral goal to storage
     * Also updates baseline values based on goal's currentAmount
     */
    function saveBehavioralGoal(behavioralGoal) {
        var jsonObject = StorageModule.retrieveStorageObject();
        
        // Initialize behavioralGoals array if it doesn't exist
        if (!jsonObject.behavioralGoals) {
            jsonObject.behavioralGoals = [];
        }
        
        jsonObject.behavioralGoals.push(behavioralGoal);
        
        // Update baseline values based on goal type
        // This ensures baseline reflects the currentAmount from the goal
        if (behavioralGoal.type === 'quantitative' && jsonObject.option && jsonObject.option.baseline) {
            var baseline = jsonObject.option.baseline;
            var measurementDays = behavioralGoal.measurementTimeline || 7;
            
            if (behavioralGoal.unit === 'times') {
                // Convert to weekly equivalent for baseline
                var weeklyEquivalent = (behavioralGoal.currentAmount / measurementDays) * 7;
                baseline.timesDone = Math.round(weeklyEquivalent);
                baseline.usageTimeline = measurementDays === 1 ? 'day' : measurementDays === 7 ? 'week' : 'month';
                baseline.valuesTimesDone = true;
            } else if (behavioralGoal.unit === 'minutes') {
                // Store as hours and minutes
                var weeklyMinutes = (behavioralGoal.currentAmount / measurementDays) * 7;
                baseline.timeSpentHours = Math.floor(weeklyMinutes / 60);
                baseline.timeSpentMinutes = Math.round(weeklyMinutes % 60);
                baseline.timeTimeline = measurementDays === 1 ? 'day' : measurementDays === 7 ? 'week' : 'month';
                baseline.valuesTime = true;
            } else if (behavioralGoal.unit === 'dollars') {
                // Convert to weekly equivalent for baseline
                var weeklyEquivalent = (behavioralGoal.currentAmount / measurementDays) * 7;
                baseline.moneySpent = Math.round(weeklyEquivalent);
                baseline.spendingTimeline = measurementDays === 1 ? 'day' : measurementDays === 7 ? 'week' : 'month';
                baseline.valuesMoney = true;
            }
            
            console.log('[BehavioralGoals] Updated baseline from goal:', {
                unit: behavioralGoal.unit,
                currentAmount: behavioralGoal.currentAmount,
                baseline: baseline
            });
        }
        
        StorageModule.setStorageObject(jsonObject);
        
        return behavioralGoal;
    }

    /**
     * Get all behavioral goals from storage
     */
    function getBehavioralGoals() {
        var jsonObject = StorageModule.retrieveStorageObject();
        return jsonObject.behavioralGoals || [];
    }

    /**
     * Get a specific behavioral goal by ID
     */
    function getBehavioralGoalById(goalId) {
        var goals = getBehavioralGoals();
        return goals.find(function(g) { return g.id === goalId; });
    }

    /**
     * Create a mood record linked to a qualitative behavioral goal
     * This creates an action record with a reference to the goal
     */
    function createMoodRecordForBehavioralGoal(goalId, smileyValue, comment) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var now = Math.round(Date.now() / 1000);
        
        // Create action record with behavioral goal reference
        var newRecord = {
            timestamp: now.toString(),
            clickType: 'mood',
            clickStamp: now,
            comment: comment || '',
            smiley: smileyValue,
            behavioralGoalId: goalId  // Link to the qualitative behavioral goal
        };
        
        jsonObject.action.push(newRecord);
        
        // Also update the goal's moodRecords array with reference
        if (jsonObject.behavioralGoals) {
            var goal = jsonObject.behavioralGoals.find(function(g) { return g.id === goalId; });
            if (goal && goal.moodRecords) {
                goal.moodRecords.push(now.toString());
            }
        }
        
        StorageModule.setStorageObject(jsonObject);
        
        // Add to habit log display
        ActionLogModule.placeActionIntoLog(now, 'mood', null, comment, smileyValue, false);
        
        return newRecord;
    }

    /**
     * Get mood records linked to a specific behavioral goal
     */
    function getMoodRecordsForGoal(goalId) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var moodRecords = jsonObject.action.filter(function(a) {
            return a && a.clickType === 'mood' && a.behavioralGoalId === goalId;
        });
        return moodRecords.sort(function(a, b) {
            return parseInt(b.timestamp) - parseInt(a.timestamp);
        });
    }

    /**
     * Calculate average mood for a goal's mood records
     */
    function calculateAverageMood(moodRecords) {
        if (!moodRecords || moodRecords.length === 0) return null;
        var sum = moodRecords.reduce(function(acc, r) {
            return acc + (parseInt(r.smiley) || 0);
        }, 0);
        return (sum / moodRecords.length).toFixed(1);
    }

    /**
     * Calculate days remaining until goal completion
     */
    function calculateDaysRemaining(goal) {
        var createdDate = new Date(goal.createdAt);
        var endDate = new Date(createdDate.getTime() + (goal.completionTimeline * 24 * 60 * 60 * 1000));
        var now = new Date();
        // Use floor so that >12 hours passed = shows 1 less day
        var daysRemaining = Math.floor((endDate - now) / (24 * 60 * 60 * 1000));
        return Math.max(0, daysRemaining);
    }

    /**
     * Calculate days elapsed since goal creation
     */
    function calculateDaysElapsed(goal) {
        var createdDate = new Date(goal.createdAt);
        var now = new Date();
        return Math.floor((now - createdDate) / (24 * 60 * 60 * 1000));
    }

    /**
     * Generate schedule milestones for quantifiable goal.
     * 
     * This is ACTION-AWARE: it factors in user actions to determine which
     * milestones are completed, missed, or upcoming. If the user is off-track,
     * remaining milestones are recalculated to fit the remaining time.
     * 
     * @param {Object} goal - Behavioral goal object
     * @returns {Object} - { display: Array (sampled for UI), all: Array (full schedule) }
     */
    function generateScheduleMilestones(goal) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var baseline = (jsonObject.option && jsonObject.option.baseline) || {};
        var isDoLess = baseline.decreaseHabit === true;
        var actions = jsonObject.action || [];
        
        var now = Date.now();
        var goalStartMs = goal.createdAt;
        var goalEndMs = goalStartMs + (goal.completionTimeline * 24 * 60 * 60 * 1000);
        var goalStartSec = Math.floor(goalStartMs / 1000);
        
        // Get relevant actions since goal started
        var relevantActions = getRelevantActions(goal, actions, goalStartSec);
        var actionCount = relevantActions.length;
        
        // Get the ORIGINAL schedule for historical reference (completed/missed status)
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
        
        // Calculate remaining milestones needed (reduced by actions taken)
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
        
        // Build combined schedule:
        // 1. Past milestones from original schedule (with completed/missed status)
        // 2. Upcoming milestones from recalculated schedule
        var combinedMilestones = [];
        var milestoneIndex = 1;
        
        // Add past milestones from original schedule
        for (var i = 0; i < originalSchedule.length; i++) {
            var m = originalSchedule[i];
            if (m.timestamp <= now) {
                // Determine status based on actions
                // For each passed milestone, check if there was an action before it
                var actionsBeforeThis = relevantActions.filter(function(a) {
                    return parseInt(a.timestamp) * 1000 <= m.timestamp;
                }).length;
                
                var status;
                if (isDoLess) {
                    // DO LESS: milestone completed if action count <= milestone index
                    status = actionsBeforeThis <= i ? 'completed' : 'missed';
                } else {
                    // DO MORE: milestone completed if action count >= milestone index
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
        var allFormatted = combinedMilestones.map(function(m, idx) {
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
     * Process milestones with action awareness.
     * 
     * DO LESS: Milestone completed if NO action occurred before it
     * DO MORE: Milestone completed if action occurred before it
     * 
     * @param {Array} schedule - Original milestone schedule
     * @param {Array} actions - Sorted relevant actions
     * @param {boolean} isDoLess - Whether this is a do-less goal
     * @param {number} now - Current timestamp ms
     * @param {number} goalEndMs - Goal end timestamp ms
     * @returns {Array} - Processed milestones with status
     */
    function processMilestonesWithActions(schedule, actions, isDoLess, now, goalEndMs) {
        var result = [];
        var actionIndex = 0;
        var completedCount = 0;
        var missedCount = 0;
        
        for (var i = 0; i < schedule.length; i++) {
            var milestone = schedule[i];
            var milestoneTime = milestone.timestamp;
            var status = 'upcoming';
            
            // Only evaluate milestones that have passed
            if (milestoneTime <= now) {
                if (isDoLess) {
                    // DO LESS: Complete if NO action before milestone
                    var actionBeforeMilestone = false;
                    while (actionIndex < actions.length) {
                        var actionTimeMs = parseInt(actions[actionIndex].timestamp) * 1000;
                        if (actionTimeMs < milestoneTime) {
                            actionBeforeMilestone = true;
                            actionIndex++;
                            break;
                        } else {
                            break;
                        }
                    }
                    status = actionBeforeMilestone ? 'missed' : 'completed';
                } else {
                    // DO MORE: Complete if action occurred before milestone
                    var actionBeforeMilestone = false;
                    while (actionIndex < actions.length) {
                        var actionTimeMs = parseInt(actions[actionIndex].timestamp) * 1000;
                        if (actionTimeMs < milestoneTime) {
                            actionBeforeMilestone = true;
                            actionIndex++;
                            break;
                        } else {
                            break;
                        }
                    }
                    status = actionBeforeMilestone ? 'completed' : 'missed';
                }
                
                if (status === 'completed') completedCount++;
                if (status === 'missed') missedCount++;
            }
            
            result.push({
                timestamp: milestoneTime,
                index: milestone.index,
                progress: milestone.progress,
                status: status
            });
        }
        
        // If there are missed milestones, recalculate upcoming milestones
        if (missedCount > 0) {
            var upcomingIndices = [];
            for (var i = 0; i < result.length; i++) {
                if (result[i].status === 'upcoming') {
                    upcomingIndices.push(i);
                }
            }
            
            if (upcomingIndices.length > 0) {
                var remainingTime = goalEndMs - now;
                var interval = remainingTime / upcomingIndices.length;
                
                for (var j = 0; j < upcomingIndices.length; j++) {
                    var idx = upcomingIndices[j];
                    result[idx].timestamp = now + (interval * (j + 1));
                    result[idx].recalculated = true;
                }
            }
        }
        
        return result;
    }

    /**
     * Get current period usage/spending from actions
     */
    function getCurrentPeriodActual(goal) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var now = Date.now();
        var periodStart = now - (goal.measurementTimeline * 24 * 60 * 60 * 1000);
        
        if (goal.unit === 'dollars') {
            var boughtActions = jsonObject.action.filter(function(a) {
                return a && a.clickType === 'bought' && 
                       (parseInt(a.timestamp) * 1000) >= periodStart;
            });
            return boughtActions.reduce(function(sum, a) {
                return sum + (parseFloat(a.spent) || 0);
            }, 0);
        } else if (goal.unit === 'times') {
            var usedActions = jsonObject.action.filter(function(a) {
                return a && a.clickType === 'used' && 
                       (parseInt(a.timestamp) * 1000) >= periodStart;
            });
            return usedActions.length;
        } else if (goal.unit === 'minutes') {
            // For time-based goals, estimate from usage frequency
            var usedActions = jsonObject.action.filter(function(a) {
                return a && a.clickType === 'used' && 
                       (parseInt(a.timestamp) * 1000) >= periodStart;
            });
            return usedActions.length * 15; // Estimate 15 min per use
        }
        return 0;
    }

    /**
     * Calculate progress percentage for quantifiable goal
     */
    function calculateProgress(goal) {
        var daysElapsed = calculateDaysElapsed(goal);
        var totalDays = goal.completionTimeline;
        var currentAmount = goal.currentAmount;
        var goalAmount = goal.goalAmount;
        var actualNow = getCurrentPeriodActual(goal);
        
        // Expected amount at this point in time (linear interpolation)
        var expectedNow = currentAmount - ((currentAmount - goalAmount) * (daysElapsed / totalDays));
        expectedNow = Math.max(goalAmount, Math.min(currentAmount, expectedNow));
        
        // Calculate how on-track they are
        if (currentAmount === goalAmount) return 100;
        
        var difference = currentAmount - goalAmount;
        var progressMade = currentAmount - actualNow;
        var progressPct = Math.min(100, Math.max(0, Math.round((progressMade / difference) * 100)));
        
        return progressPct;
    }

    /**
     * Render unified goals accordion (all goal types together)
     */
    function renderBehavioralGoalsList() {
        var allGoals = getBehavioralGoals();
        var container = $('#goals-accordion');
        
        if (allGoals.length === 0) {
            container.html('<p class="text-center text-muted no-goals-message">No goals created yet. Create your first goal above!</p>');
            return;
        }
        
        // Sort by creation date (newest first)
        allGoals.sort(function(a, b) {
            return b.createdAt - a.createdAt;
        });
        
        var html = '';
        allGoals.forEach(function(goal, index) {
            if (goal.type === 'qualitative') {
                html += renderQualitativeGoalItem(goal, index);
            } else {
                html += renderQuantitativeGoalItem(goal, index);
            }
        });
        
        container.html(html);
        setupUnifiedAccordionListeners();
    }

    /**
     * Render wellbeing/qualitative goal item
     */
    function renderQualitativeGoalItem(goal, index) {
        var moodRecords = getMoodRecordsForGoal(goal.id);
        var avgMood = calculateAverageMood(moodRecords);
        var daysRemaining = calculateDaysRemaining(goal);
        var progressPct = Math.min(100, Math.round((calculateDaysElapsed(goal) / goal.completionTimeline) * 100));
        
        // Determine color based on average mood
        var colorClass = 'goal-neutral';
        if (avgMood !== null) {
            colorClass = parseFloat(avgMood) >= 2.5 ? 'goal-good-mood' : 'goal-bad-mood';
        }
        
        var moodSmileyPath = getMoodSmileyPath(avgMood);
        
        var html = '<div class="goal-accordion-item ' + colorClass + '" data-goal-id="' + goal.id + '" data-goal-type="qualitative">' +
            '<div class="goal-summary">' +
                '<div class="goal-summary-header">' +
                    '<span class="goal-type-badge badge-qualitative">Wellbeing</span>' +
                    '<span class="goal-days-left">' + daysRemaining + ' days left</span>' +
                '</div>' +
                '<div class="goal-summary-title">' + escapeHtml(truncateText(goal.tenetText, 100)) + '</div>' +
                '<div class="goal-summary-stats">' +
                    '<div class="goal-stat-item">' +
                        '<span class="goal-stat-value">' +
                            (moodSmileyPath ? '<img class="mood-smiley-img" src="' + moodSmileyPath + '" alt="mood">' : '—') +
                        '</span>' +
                        '<span class="goal-stat-label">Avg Mood</span>' +
                    '</div>' +
                    '<div class="goal-stat-item">' +
                        '<span class="goal-stat-value">' + moodRecords.length + '</span>' +
                        '<span class="goal-stat-label">Check-ins</span>' +
                    '</div>' +
                '</div>' +
                // Inline check-in form
                '<div class="goal-inline-checkin" data-goal-id="' + goal.id + '">' +
                    '<div class="inline-smileys">' +
                        '<img class="inline-smiley" data-mood="0" src="../assets/images/mood-smiley-0.png" alt="Very bad">' +
                        '<img class="inline-smiley" data-mood="1" src="../assets/images/mood-smiley-1.png" alt="Bad">' +
                        '<img class="inline-smiley selected" data-mood="2" src="../assets/images/mood-smiley-2.png" alt="Neutral">' +
                        '<img class="inline-smiley" data-mood="3" src="../assets/images/mood-smiley-3.png" alt="Good">' +
                        '<img class="inline-smiley" data-mood="4" src="../assets/images/mood-smiley-4.png" alt="Very good">' +
                    '</div>' +
                    '<button class="btn btn-outline-success btn-sm inline-checkin-btn" data-goal-id="' + goal.id + '">' +
                        '<i class="fas fa-plus"></i> Check-in' +
                    '</button>' +
                '</div>' +
                '<i class="fas fa-chevron-down goal-expand-icon"></i>' +
            '</div>' +
            '<div class="goal-details">' +
                '<div class="goal-details-content">' +
                    '<div class="goal-progress-container">' +
                        '<div class="goal-progress-bar">' +
                            '<div class="goal-progress-fill ' + (parseFloat(avgMood) >= 2.5 ? 'on-track' : 'behind') + '" style="width: ' + progressPct + '%"></div>' +
                        '</div>' +
                        '<div class="goal-progress-text">' + progressPct + '% of time elapsed</div>' +
                    '</div>' +
                    '<div class="goal-mood-records">' +
                        '<h5><i class="fas fa-history"></i> Recent Check-ins</h5>' +
                        renderMoodRecordsList(moodRecords.slice(0, 5)) +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
        
        return html;
    }

    /**
     * Render quantitative goal item (usage, time, spending)
     */
    function renderQuantitativeGoalItem(goal, index) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var baseline = (jsonObject.option && jsonObject.option.baseline) || {};
        var actions = jsonObject.action || [];
        var isDoLess = baseline.decreaseHabit === true;
        
        var daysRemaining = calculateDaysRemaining(goal);
        var daysElapsed = calculateDaysElapsed(goal);
        
        // Get the schedule result which includes both display milestones and full schedule
        var scheduleResult = generateScheduleMilestones(goal);
        var milestones = scheduleResult.display;
        var allMilestones = scheduleResult.all;
        
        // Store in cache for later access (filtering, etc.)
        milestoneCache[goal.id] = {
            all: allMilestones,
            isDoLess: isDoLess
        };
        
        var progressPct = calculateProgress(goal);
        
        // Get total milestones and action counts for tracking
        var totalMilestones = StatsCalculationsModule.calculateTotalMilestones(goal);
        var goalStartSec = Math.floor(goal.createdAt / 1000);
        var actionCount = StatsCalculationsModule.getActualCountSinceGoalStart(goal, actions, goalStartSec);
        
        // Find the FIRST UPCOMING milestone from the schedule for "wait until" display
        // This ensures the stat matches what's shown in the milestones list
        var nextUpcomingMilestone = null;
        for (var i = 0; i < allMilestones.length; i++) {
            if (allMilestones[i].status === 'upcoming') {
                nextUpcomingMilestone = allMilestones[i];
                break;
            }
        }
        
        // Count milestones that have passed (completed + missed)
        var milestonesPassedCount = allMilestones.filter(function(m) { 
            return m.status === 'completed' || m.status === 'missed'; 
        }).length;
        
        // Calculate track status based on condition
        // DO LESS: behind = MORE actions than milestones passed (you've done too many)
        // DO MORE: behind = FEWER actions than milestones passed (you haven't done enough)
        var trackDiff;
        var trackStatus;
        if (isDoLess) {
            // For "do less": each action should match a passed milestone
            // If you have more actions than milestones passed, you're behind
            trackDiff = actionCount - milestonesPassedCount;
            if (trackDiff > 0) {
                trackStatus = { status: 'behind', count: trackDiff };
            } else if (trackDiff < 0) {
                trackStatus = { status: 'ahead', count: Math.abs(trackDiff) };
            } else {
                trackStatus = { status: 'on-track', count: 0 };
            }
        } else {
            // For "do more": each passed milestone should have a matching action
            // If you have fewer actions than milestones passed, you're behind
            trackDiff = milestonesPassedCount - actionCount;
            if (trackDiff > 0) {
                trackStatus = { status: 'behind', count: trackDiff };
            } else if (trackDiff < 0) {
                trackStatus = { status: 'ahead', count: Math.abs(trackDiff) };
            } else {
                trackStatus = { status: 'on-track', count: 0 };
            }
        }
        
        var isOnTrack = trackStatus.status === 'on-track' || trackStatus.status === 'ahead';
        var isComplete = nextUpcomingMilestone === null;
        
        var colorClass = isOnTrack ? 'goal-on-track' : 'goal-behind';
        
        // Determine badge type and labels
        var badgeClass, badgeLabel, unitLabel, periodLabel;
        if (goal.unit === 'times') {
            badgeClass = 'badge-usage';
            badgeLabel = 'Usage';
            unitLabel = 'times';
        } else if (goal.unit === 'minutes') {
            badgeClass = 'badge-time';
            badgeLabel = 'Time';
            unitLabel = 'min';
        } else {
            badgeClass = 'badge-spending';
            badgeLabel = 'Spending';
            unitLabel = '$';
        }
        periodLabel = goal.measurementTimeline === 1 ? 'day' : (goal.measurementTimeline === 7 ? 'week' : 'month');
        
        // Goal title with highlighted current and goal values
        var goalTitle = '<span class="goal-value-current">' + goal.currentAmount + '</span> → ' + 
                        '<span class="goal-value-target">' + goal.goalAmount + '</span> ' + 
                        unitLabel + '/' + periodLabel;
        
        // Milestone label and time from the SCHEDULE (matches displayed milestones)
        var milestoneLabel = isDoLess ? 'Wait until' : 'Do it by';
        var milestoneTimeDisplay = 'Complete!';
        var milestoneCountdown = '';
        if (nextUpcomingMilestone && !isComplete) {
            milestoneTimeDisplay = formatMilestoneClockTime(nextUpcomingMilestone.timestamp);
            milestoneCountdown = StatsCalculationsModule.formatMilestoneTime(nextUpcomingMilestone.timestamp);
        }
        
        // Milestone progress display - count from ALL milestones
        var milestonesCompleted = allMilestones.filter(function(m) { return m.status === 'completed'; }).length;
        var milestonesMissed = allMilestones.filter(function(m) { return m.status === 'missed'; }).length;
        
        // Build track status display
        var trackStatusDisplay;
        var trackStatusClass = '';
        if (trackStatus.status === 'on-track') {
            trackStatusDisplay = 'On track';
            trackStatusClass = 'status-on-track';
        } else if (trackStatus.status === 'behind') {
            trackStatusDisplay = trackStatus.count + ' behind';
            trackStatusClass = 'status-behind';
        } else {
            // Only "do more" shows ahead status
            trackStatusDisplay = isDoLess ? 'On track' : (trackStatus.count + ' ahead');
            trackStatusClass = 'status-ahead';
        }
        
        // Calculate time-based progress (proportion of time elapsed)
        var goalStartMs = goal.createdAt;
        var goalEndMs = goalStartMs + (goal.completionTimeline * 24 * 60 * 60 * 1000);
        var nowMs = Date.now();
        var timeProgressPct = Math.min(100, Math.max(0, Math.round(((nowMs - goalStartMs) / (goalEndMs - goalStartMs)) * 100)));
        
        // Generate milestone markers for progress bar (use all milestones)
        var milestoneMarkers = generateMilestoneMarkers(allMilestones, goalStartMs, goalEndMs);
        
        // Format end date
        var endDate = new Date(goalEndMs);
        var endDateStr = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        // Calculate progress completed (actions done vs total needed)
        var progressCompletedPct = isDoLess 
            ? Math.min(100, Math.round((actionCount / totalMilestones) * 100))
            : Math.min(100, Math.round((1 - (actionCount / totalMilestones)) * 100));
        
        // Build track status badge
        var trackBadgeClass = trackStatus.status === 'on-track' ? 'badge-on-track' : 
                              (trackStatus.status === 'ahead' ? 'badge-ahead' : 'badge-behind');
        var trackBadgeText = trackStatus.status === 'on-track' ? 'On track' :
                             (trackStatus.status === 'ahead' ? trackStatus.count + ' ahead' : trackStatus.count + ' behind');
        
        var html = '<div class="goal-accordion-item ' + colorClass + '" data-goal-id="' + goal.id + '" data-goal-type="quantitative">' +
            '<button class="goal-delete-btn" data-goal-id="' + goal.id + '" title="Delete goal"><i class="fas fa-times"></i></button>' +
            '<div class="goal-summary">' +
                '<div class="goal-summary-header">' +
                    '<span class="goal-days-left">' + daysRemaining + ' days left</span>' +
                '</div>' +
                '<div class="goal-summary-title">' + goalTitle + ' <i class="fas fa-chevron-down goal-expand-icon"></i></div>' +
                '<div class="goal-summary-stats">' +
                    '<div class="goal-stat-item goal-stat-left">' +
                        '<span class="goal-type-badge ' + trackBadgeClass + '">' + trackBadgeText + '</span>' +
                        '<span class="goal-stat-value">' + Math.max(0, totalMilestones - actionCount) + ' milestones left</span>' +
                        '<span class="goal-stat-label">' + actionCount + ' used / ' + milestonesPassedCount + ' available</span>' +
                    '</div>' +
                    '<div class="goal-stat-item goal-stat-right">' +
                        '<div class="stat-milestone-datetime">' +
                            '<div class="stat-milestone-countdown">' + milestoneCountdown + '</div>' +
                            '<div class="stat-milestone-clock">' +
                                '<div class="stat-milestone-time">' + milestoneTimeDisplay + '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="goal-stat-label">' + milestoneLabel + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="goal-dual-progress">' +
                    '<div class="goal-progress-legend">' +
                        '<span class="legend-item"><span class="legend-dot time"></span>Time</span>' +
                        '<span class="legend-item"><span class="legend-dot progress"></span>Amount done</span>' +
                    '</div>' +
                    '<div class="goal-progress-bar goal-progress-with-markers">' +
                        '<div class="goal-progress-fill time-progress" style="width: ' + timeProgressPct + '%"></div>' +
                        '<div class="goal-progress-fill goal-progress ' + (isOnTrack ? 'on-track' : 'behind') + '" style="width: ' + progressCompletedPct + '%"></div>' +
                        '<div class="goal-time-marker" style="left: ' + timeProgressPct + '%"></div>' +
                        milestoneMarkers +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="goal-details">' +
                '<div class="goal-details-content">' +
                    '<div class="goal-calendar-container">' +
                        '<h5><i class="fas fa-calendar"></i> Calendar View <small>(click date to filter)</small></h5>' +
                        '<div class="goal-milestone-calendar" data-goal-id="' + goal.id + '" ' +
                            'data-milestone-dates="' + getMilestoneDatesJson(allMilestones) + '" ' +
                            'data-goal-start="' + goalStartMs + '" ' +
                            'data-goal-end="' + goalEndMs + '"></div>' +
                        '<div class="calendar-filter-info" style="display:none;">' +
                            '<span class="filter-date"></span>' +
                            '<button class="clear-filter-btn btn btn-sm btn-outline-secondary">Clear filter</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="goal-milestones" data-goal-id="' + goal.id + '" data-is-do-less="' + isDoLess + '">' +
                        '<h5><i class="fas fa-list-check"></i> Milestones (' + milestonesCompleted + ' completed, ' + milestonesMissed + ' missed of ' + totalMilestones + ' total)</h5>' +
                        '<div class="milestones-list-container">' +
                            renderMilestoneDaySummaries(allMilestones, isDoLess, goal.id) +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
        
        return html;
    }
    
    /**
     * Format milestone timestamp as clock time (e.g., "3:45 PM")
     */
    function formatMilestoneClockTime(timestampMs) {
        var date = new Date(timestampMs);
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        
        return hours + ':' + minutes + ' ' + ampm;
    }
    
    /**
     * Convert milestones array to JSON string with dates for calendar.
     * This aggregates milestones by date for density calculation.
     */
    function getMilestoneDatesJson(milestones) {
        // Group milestones by date to handle multiple milestones on same day
        var dateMap = {};
        milestones.forEach(function(m) {
            var dateStr = formatDateForCalendar(m.timestamp);
            if (!dateMap[dateStr]) {
                dateMap[dateStr] = { date: dateStr, count: 0, statuses: [] };
            }
            dateMap[dateStr].count++;
            dateMap[dateStr].statuses.push(m.status || (m.isPast ? 'past' : 'upcoming'));
        });
        
        // Convert to array with priority status (completed > missed > upcoming)
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
     * Format timestamp as YYYY-MM-DD for calendar matching
     */
    function formatDateForCalendar(timestamp) {
        // Create date from timestamp and format in LOCAL timezone
        var d = new Date(timestamp);
        var year = d.getFullYear();
        var month = ('0' + (d.getMonth() + 1)).slice(-2);
        var day = ('0' + d.getDate()).slice(-2);
        
        return year + '-' + month + '-' + day;
    }
    
    /**
     * Initialize milestone calendars after rendering
     * Called when accordion expands
     * 
     * Features:
     * - Days with milestones are highlighted
     * - Opacity indicates milestone density (more milestones = more opaque)
     * - Click on date to filter milestones list
     */
    function initMilestoneCalendars() {
        $('.goal-milestone-calendar').each(function() {
            var $calendar = $(this);
            
            // Skip if already initialized
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
            
            // Create lookup maps: status and count per date
            // Data is now pre-aggregated by getMilestoneDatesJson
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
                    // Filter milestones by selected date
                    filterMilestonesByDate(goalId, dateText);
                },
                beforeShowDay: function(date) {
                    var dateStr = formatDateForCalendar(date.getTime());
                    var status = dateStatusMap[dateStr];
                    var count = dateCountMap[dateStr] || 0;
                    
                    // Calculate density class (1-5) based on count
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
     * Filter milestones list by selected date.
     * Re-renders the milestone list from the cached data, filtered to the selected date.
     */
    function filterMilestonesByDate(goalId, dateText) {
        var $container = $('.goal-milestones[data-goal-id="' + goalId + '"]');
        var $listContainer = $container.find('.milestones-list-container');
        var $filterInfo = $container.closest('.goal-details-content').find('.calendar-filter-info');
        
        // Get data from cache
        var cached = milestoneCache[goalId];
        if (!cached) {
            console.warn('No cached milestone data for goal:', goalId);
            return;
        }
        
        var allMilestones = cached.all;
        var isDoLess = cached.isDoLess;
        
        if (!dateText) {
            // Clear filter - show day summaries view
            $listContainer.html(renderMilestoneDaySummaries(allMilestones, isDoLess, goalId));
            $filterInfo.hide();
            return;
        }
        
        // Parse the date from datepicker
        // jQuery datepicker can return MM/DD/YYYY or YYYY-MM-DD depending on config
        var selectedDateStr;
        
        if (dateText.indexOf('/') > -1) {
            // MM/DD/YYYY format - parse and reformat
            var parts = dateText.split('/');
            var month = ('0' + parts[0]).slice(-2);
            var day = ('0' + parts[1]).slice(-2);
            var year = parts[2];
            selectedDateStr = year + '-' + month + '-' + day;
        } else if (dateText.indexOf('-') > -1) {
            // Already YYYY-MM-DD format - use directly
            selectedDateStr = dateText;
        } else {
            // Fallback: parse and format
            var d = new Date(dateText + 'T12:00:00');
            selectedDateStr = formatDateForCalendar(d.getTime());
        }
        
        // Create date object at noon local time for display
        var selectedDate = new Date(selectedDateStr + 'T12:00:00');
        
        console.log('[Calendar] Selected date:', dateText, '-> parsed as:', selectedDateStr);
        
        // Filter milestones for the selected date
        var filteredMilestones = allMilestones.filter(function(m) {
            var mileDateStr = formatDateForCalendar(m.timestamp);
            return mileDateStr === selectedDateStr;
        });
        
        // Format date for display
        var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        var displayDate = dayNames[selectedDate.getDay()] + ' ' + (selectedDate.getMonth() + 1) + '/' + selectedDate.getDate();
        
        // Re-render with filtered milestones
        if (filteredMilestones.length > 0) {
            $listContainer.html(renderMilestonesList(filteredMilestones, isDoLess));
        } else {
            $listContainer.html('<p class="text-muted text-center">No milestones on this date.</p>');
        }
        
        // Show filter info
        $filterInfo.find('.filter-date').text(displayDate + ' — ' + filteredMilestones.length + ' milestone' + (filteredMilestones.length !== 1 ? 's' : ''));
        $filterInfo.show();
    }
    
    /**
     * Convert display date format back to YYYY-MM-DD
     */
    function formatDateFromDisplay(displayDate) {
        try {
            var d = new Date(displayDate);
            if (isNaN(d.getTime())) return '';
            return formatDateForCalendar(d.getTime());
        } catch (e) {
            return '';
        }
    }
    
    /**
     * Generate milestone marker HTML for progress bar.
     * Markers show at their proportional position on the timeline.
     */
    function generateMilestoneMarkers(milestones, goalStartMs, goalEndMs) {
        if (!milestones || milestones.length === 0) return '';
        
        var totalDuration = goalEndMs - goalStartMs;
        var html = '';
        
        // Show ALL milestone markers - they'll be thin ticks
        for (var i = 0; i < milestones.length; i++) {
            var m = milestones[i];
            var position = ((m.timestamp - goalStartMs) / totalDuration) * 100;
            position = Math.min(100, Math.max(0, position));
            
            var markerClass = 'milestone-marker';
            if (m.isCompleted || m.status === 'completed') markerClass += ' completed';
            if (m.isMissed || m.status === 'missed') markerClass += ' missed';
            if (m.status === 'upcoming') markerClass += ' upcoming';
            
            html += '<div class="' + markerClass + '" style="left: ' + position.toFixed(2) + '%" title="Milestone ' + m.index + ' - ' + new Date(m.timestamp).toLocaleTimeString() + '"></div>';
        }
        
        return html;
    }

    /**
     * Get next upcoming milestone
     */
    function getNextMilestone(milestones) {
        for (var i = 0; i < milestones.length; i++) {
            if (!milestones[i].isPast) {
                return milestones[i];
            }
        }
        return null;
    }

    /**
     * Calculate time until next milestone
     */
    function calculateTimeUntilNextMilestone(goal, nextMilestone) {
        if (!nextMilestone) {
            return 'Complete!';
        }
        
        var now = new Date();
        var milestoneDate = nextMilestone.date;
        var diffMs = milestoneDate - now;
        
        if (diffMs <= 0) {
            return 'Now';
        }
        
        var diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        var diffHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        
        if (diffDays > 0) {
            return diffDays + 'd ' + diffHours + 'h';
        }
        return diffHours + 'h';
    }

    /**
     * Render day summaries for milestones (default view).
     * Groups milestones by day and shows summary cards that can be clicked to expand.
     * 
     * @param {Array} milestones - Array of ALL milestone objects
     * @param {boolean} isDoLess - Whether this is a "do less" goal
     * @param {string} goalId - Goal ID for click handling
     * @returns {string} - HTML string
     */
    function renderMilestoneDaySummaries(milestones, isDoLess, goalId) {
        if (!milestones || milestones.length === 0) {
            return '<p class="text-muted text-center" style="font-size: 0.85rem;">No milestones generated.</p>';
        }
        
        // Group milestones by day (using local timezone)
        var dayGroups = {};
        milestones.forEach(function(m) {
            // Create date in local timezone from timestamp
            var dateObj = new Date(m.timestamp);
            var dayKey = formatDateForCalendar(m.timestamp);
            
            if (!dayGroups[dayKey]) {
                // Store a date object at noon local time for this day (avoids timezone edge cases)
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
        
        // Sort days chronologically
        var sortedDays = Object.keys(dayGroups).sort();
        
        var html = '';
        sortedDays.forEach(function(dayKey) {
            var group = dayGroups[dayKey];
            var count = group.milestones.length;
            var dateObj = group.date;
            
            // Format day name: "Tuesday 1/27"
            var dayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
            var dayName = dayNames[dateObj.getDay()];
            var dateLabel = dayName + ' ' + (dateObj.getMonth() + 1) + '/' + dateObj.getDate();
            
            // Calculate average interval between milestones on this day
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
            
            // Count statuses
            var completed = group.milestones.filter(function(m) { return m.status === 'completed'; }).length;
            var missed = group.milestones.filter(function(m) { return m.status === 'missed'; }).length;
            var upcoming = count - completed - missed;
            
            // Determine overall day status
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
     * Shows individual milestone cards with number in block format.
     * 
     * @param {Array} milestones - Array of milestone objects
     * @param {boolean} isDoLess - Whether this is a "do less" goal
     * @returns {string} - HTML string
     */
    function renderMilestonesList(milestones, isDoLess) {
        if (!milestones || milestones.length === 0) {
            return '<p class="text-muted text-center" style="font-size: 0.85rem;">No milestones for this day.</p>';
        }
        
        var html = '';
        
        milestones.forEach(function(m, idx) {
            // Handle both Date objects and timestamps
            var dateObj = m.date instanceof Date ? m.date : new Date(m.timestamp);
            
            // Format: "Tues at 4:36pm"
            var dayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
            var dayName = dayNames[dateObj.getDay()];
            var timeStr = formatMilestoneTimeCompact(m.timestamp);
            var dateTimeStr = dayName + ' at ' + timeStr;
            
            // Determine status class
            var statusClass = '';
            if (m.status === 'completed' || m.isCompleted) {
                statusClass = 'milestone-completed';
            } else if (m.status === 'missed' || m.isMissed) {
                statusClass = 'milestone-missed';
            } else {
                statusClass = 'milestone-upcoming';
            }
            
            // Milestone number (just the number, no "Milestone" text)
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
     * Render list of mood records
     */
    function renderMoodRecordsList(records) {
        if (!records || records.length === 0) {
            return '<p class="text-muted text-center" style="font-size: 0.85rem;">No check-ins yet.</p>';
        }
        
        var html = '';
        records.forEach(function(record) {
            var date = new Date(parseInt(record.timestamp) * 1000);
            var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            var smileyPath = '../assets/images/mood-smiley-' + (record.smiley || 2) + '.png';
            
            html += '<div class="mood-record-row">' +
                '<img class="mood-smiley-img" src="' + smileyPath + '" alt="mood">' +
                '<div class="mood-record-info">' +
                    '<div class="mood-record-comment">' + escapeHtml(record.comment || 'No comment') + '</div>' +
                    '<div class="mood-record-date">' + dateStr + '</div>' +
                '</div>' +
            '</div>';
        });
        
        return html;
    }

    /**
     * Get mood smiley image path from average value
     */
    function getMoodSmileyPath(avgMood) {
        if (avgMood === null) return null;
        var val = Math.round(parseFloat(avgMood));
        val = Math.max(0, Math.min(4, val));
        return '../assets/images/mood-smiley-' + val + '.png';
    }


    /**
     * Setup unified accordion listeners (CSS-based, no DOM changes)
     */
    function setupUnifiedAccordionListeners() {
        // Toggle accordion on summary click (except on interactive elements)
        $(document).off('click', '.goal-summary').on('click', '.goal-summary', function(e) {
            // Don't toggle if clicking on inline check-in elements
            if ($(e.target).closest('.goal-inline-checkin').length) {
                return;
            }
            var $item = $(this).closest('.goal-accordion-item');
            $item.toggleClass('expanded');
            
            // Initialize calendar when accordion expands
            if ($item.hasClass('expanded')) {
                setTimeout(function() {
                    initMilestoneCalendars();
                }, 100);
            }
        });
        
        // Inline smiley selection
        $(document).off('click', '.inline-smiley').on('click', '.inline-smiley', function(e) {
            e.stopPropagation();
            $(this).closest('.inline-smileys').find('.inline-smiley').removeClass('selected');
            $(this).addClass('selected');
        });
        
        // Inline check-in button
        $(document).off('click', '.inline-checkin-btn').on('click', '.inline-checkin-btn', function(e) {
            e.stopPropagation();
            var goalId = $(this).data('goal-id');
            var container = $(this).closest('.goal-inline-checkin');
            var selectedMood = container.find('.inline-smiley.selected').data('mood');
            
            if (selectedMood === undefined) selectedMood = 2;
            
            createMoodRecordForBehavioralGoal(goalId, selectedMood, '');
            renderBehavioralGoalsList();
            NotificationsModule.createNotification('Check-in added!', null, { type: 'mood_added' });
        });
        
        // Delete goal button
        $(document).off('click', '.goal-delete-btn').on('click', '.goal-delete-btn', function(e) {
            e.stopPropagation();
            var goalId = $(this).data('goal-id');
            
            if (confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
                deleteBehavioralGoal(goalId);
                renderBehavioralGoalsList();
                NotificationsModule.createNotification('Goal deleted', null, { type: 'goal_deleted' });
            }
        });
        
        // Day summary click - filter to show that day's milestones
        $(document).off('click', '.milestone-day-summary').on('click', '.milestone-day-summary', function(e) {
            e.stopPropagation();
            var dateKey = $(this).data('date');
            var goalId = $(this).data('goal-id');
            filterMilestonesByDate(goalId, dateKey);
        });
        
        // Clear calendar filter button
        $(document).off('click', '.clear-filter-btn').on('click', '.clear-filter-btn', function(e) {
            e.stopPropagation();
            var $container = $(this).closest('.goal-details-content');
            var goalId = $container.find('.goal-milestones').data('goal-id');
            filterMilestonesByDate(goalId, null);
        });
    }
    
    /**
     * Delete a behavioral goal by ID
     */
    function deleteBehavioralGoal(goalId) {
        var jsonObject = StorageModule.retrieveStorageObject();
        
        if (!jsonObject.behavioralGoals) return;
        
        jsonObject.behavioralGoals = jsonObject.behavioralGoals.filter(function(g) {
            return g.id !== goalId;
        });
        
        StorageModule.setStorageObject(jsonObject);
        console.log('[BehavioralGoals] Deleted goal:', goalId);
    }


    /**
     * Truncate text to a maximum length
     */
    function truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/[&<>"']/g, function(m) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m];
        });
    }

    /**
     * Show success overlay after behavioral goal creation
     */
    function showBehavioralGoalSuccessOverlay(questionSetElement) {
        var overlay = $('<div class="behavioral-goal-success-overlay">' +
            '<button class="behavioral-goal-success-close" type="button">&times;</button>' +
            '<div class="behavioral-goal-success-content">' +
                '<i class="fas fa-check-circle fa-3x"></i>' +
                '<p>Goal successfully added!</p>' +
                '<button class="btn btn-outline-primary view-behavioral-goals-btn">View Goals</button>' +
            '</div>' +
        '</div>');
        
        questionSetElement.css('position', 'relative').append(overlay);
        
        // Close button handler
        overlay.find('.behavioral-goal-success-close').on('click', function() {
            overlay.fadeOut(200, function() { overlay.remove(); });
        });
        
        // View goals button handler
        overlay.find('.view-behavioral-goals-btn').on('click', function() {
            overlay.remove();
            $('.goals-tab-toggler').click();
        });
    }

    /**
     * Validate behavioral goal form and return data or null if invalid
     */
    function validateBehavioralGoalForm(questionSetElement, goalType) {
        var errors = [];
        var data = {};
        
        if (goalType === 'usage') {
            data.currentAmount = parseInt(questionSetElement.find('.amountDonePerWeek').val()) || 0;
            data.goalAmount = parseInt(questionSetElement.find('.goalDonePerWeek').val()) || 0;
            data.measurementTimeline = timelineToDays(questionSetElement.find('.usage-timeline-select').val());
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 7;
            data.unit = 'times';
            
            if (data.currentAmount === 0 && data.goalAmount === 0) {
                errors.push('Please enter current or goal usage amounts');
            }
        } else if (goalType === 'time') {
            var currentHours = parseInt(questionSetElement.find('.currentTimeHours').val()) || 0;
            var currentMinutes = parseInt(questionSetElement.find('.currentTimeMinutes').val()) || 0;
            var goalHours = parseInt(questionSetElement.find('.goalTimeHours').val()) || 0;
            var goalMinutes = parseInt(questionSetElement.find('.goalTimeMinutes').val()) || 0;
            
            data.currentAmount = (currentHours * 60) + currentMinutes;
            data.goalAmount = (goalHours * 60) + goalMinutes;
            data.measurementTimeline = timelineToDays(questionSetElement.find('.time-timeline-select').val());
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 7;
            data.unit = 'minutes';
            
            if (data.currentAmount === 0 && data.goalAmount === 0) {
                errors.push('Please enter current or goal time amounts');
            }
        } else if (goalType === 'spending') {
            data.currentAmount = parseInt(questionSetElement.find('.amountSpentPerWeek').val()) || 0;
            data.goalAmount = parseInt(questionSetElement.find('.goalSpentPerWeek').val()) || 0;
            data.measurementTimeline = timelineToDays(questionSetElement.find('.spending-timeline-select').val());
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 7;
            data.unit = 'dollars';
            
            if (data.currentAmount === 0 && data.goalAmount === 0) {
                errors.push('Please enter current or goal spending amounts');
            }
        } else if (goalType === 'health') {
            data.tenetText = questionSetElement.find('.tenet-text').val();
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 7;
            
            // Get mood selection
            var selectedMood = questionSetElement.find('.smiley.selected');
            if (selectedMood.length) {
                var moodMatch = selectedMood.attr('class').match(/mood-(\d)/);
                data.initialMood = moodMatch ? parseInt(moodMatch[1]) : 2;
            } else {
                data.initialMood = 2; // Default to neutral
            }
            data.initialComment = questionSetElement.find('.mood-comment-text').val() || '';
            
            if (!data.tenetText || data.tenetText.trim() === '') {
                errors.push('Please enter your wellness goal');
            }
        }
        
        if (errors.length > 0) {
            alert(errors.join('\n'));
            return null;
        }
        
        return data;
    }

    /**
     * Handle behavioral goal form submission
     */
    function handleBehavioralGoalSubmit(e) {
        e.preventDefault();
        
        var questionSet = $(this).closest('.goal-question-set');
        var goalType = null;
        
        if (questionSet.hasClass('usage-goal-questions')) {
            goalType = 'usage';
        } else if (questionSet.hasClass('time-goal-questions')) {
            goalType = 'time';
        } else if (questionSet.hasClass('spending-goal-questions')) {
            goalType = 'spending';
        } else if (questionSet.hasClass('health-goal-questions')) {
            goalType = 'health';
        }
        
        if (!goalType) return;
        
        var data = validateBehavioralGoalForm(questionSet, goalType);
        if (!data) return;
        
        var behavioralGoal = null;
        if (goalType === 'health') {
            behavioralGoal = createQualitativeGoal(data.tenetText, data.completionTimeline, data.initialMood, data.initialComment);
        } else {
            behavioralGoal = createQuantitativeGoal(data.unit, data.currentAmount, data.goalAmount, data.measurementTimeline, data.completionTimeline);
        }
        
        if (behavioralGoal) {
            showBehavioralGoalSuccessOverlay(questionSet);
        }
    }

    /**
     * Populate goal type dropdown based on baseline importance options
     * Returns the first available option value
     */
    function populateGoalTypeDropdown() {
        var jsonObject = StorageModule.retrieveStorageObject();
        var baseline = jsonObject.option.baseline;
        var dropdown = $('#create-goal-type-select');
        var firstOptionValue = null;
        
        // Clear all options
        dropdown.empty();
        
        // Add options based on selected importance values
        if (baseline.valuesTimesDone) {
            dropdown.append('<option value="usage">Usage Goal (times done)</option>');
            if (!firstOptionValue) firstOptionValue = 'usage';
        }
        if (baseline.valuesTime) {
            dropdown.append('<option value="time">Time Goal (time spent)</option>');
            if (!firstOptionValue) firstOptionValue = 'time';
        }
        if (baseline.valuesMoney) {
            dropdown.append('<option value="spending">Spending Goal (money spent)</option>');
            if (!firstOptionValue) firstOptionValue = 'spending';
        }
        if (baseline.valuesHealth) {
            dropdown.append('<option value="health">Wellbeing Goal (how it feels)</option>');
            if (!firstOptionValue) firstOptionValue = 'health';
        }
        
        // If no options are available, add a message
        if (dropdown.find('option').length === 0) {
            dropdown.append('<option value="" disabled selected>Please complete the Baseline questionnaire first</option>');
        }
        
        return firstOptionValue;
    }

    /**
     * Open create goal dialog
     * Seeds the form with baseline values if available
     */
    function openCreateGoalDialog() {
        var firstOption = populateGoalTypeDropdown();
        
        // Get baseline values to pre-populate current amounts
        var jsonObject = StorageModule.retrieveStorageObject();
        var baseline = (jsonObject.option && jsonObject.option.baseline) || {};
        
        // Pre-populate current amounts from baseline
        seedCurrentAmountsFromBaseline(baseline);
        
        // Select the first available option
        if (firstOption) {
            $('#create-goal-type-select').val(firstOption);
            handleGoalTypeChange();
            $('.create-goal-submit').prop('disabled', false);
        } else {
            $('.create-goal-submit').prop('disabled', true);
            $('.goal-type-inputs').hide();
            $('.goal-completion-timeline').hide();
        }
        
        // Use UIModule to open dialog with overlay
        UIModule.openClickDialog('.create-goal');
    }
    
    /**
     * Seed current amount fields from baseline values
     * @param {Object} baseline - Baseline settings object
     */
    function seedCurrentAmountsFromBaseline(baseline) {
        // Usage (times done)
        if (baseline.timesDone) {
            var usageTimeline = baseline.usageTimeline || 'week';
            var timesPerPeriod = baseline.timesDone;
            // Convert to the UI's default period (week)
            if (usageTimeline === 'day') {
                timesPerPeriod = timesPerPeriod * 7;
            } else if (usageTimeline === 'month') {
                timesPerPeriod = Math.round(timesPerPeriod / 4);
            }
            $('.create-amountDonePerWeek').val(timesPerPeriod);
        }
        
        // Time spent
        if (baseline.timeSpentHours || baseline.timeSpentMinutes) {
            var totalMinutes = (baseline.timeSpentHours || 0) * 60 + (baseline.timeSpentMinutes || 0);
            var timeTimeline = baseline.timeTimeline || 'week';
            // Convert to weekly if needed
            if (timeTimeline === 'day') {
                totalMinutes = totalMinutes * 7;
            } else if (timeTimeline === 'month') {
                totalMinutes = Math.round(totalMinutes / 4);
            }
            var hours = Math.floor(totalMinutes / 60);
            var minutes = Math.round((totalMinutes % 60) / 15) * 15; // Round to nearest 15
            $('.create-currentTimeHours').val(Math.min(12, hours));
            $('.create-currentTimeMinutes').val(minutes);
        }
        
        // Money spent
        if (baseline.moneySpent) {
            var spendingTimeline = baseline.spendingTimeline || 'week';
            var amountPerPeriod = baseline.moneySpent;
            // Convert to weekly if needed
            if (spendingTimeline === 'day') {
                amountPerPeriod = amountPerPeriod * 7;
            } else if (spendingTimeline === 'month') {
                amountPerPeriod = Math.round(amountPerPeriod / 4);
            }
            $('.create-amountSpentPerWeek').val(amountPerPeriod);
        }
    }

    /**
     * Open create goal dialog with seeded values from baseline
     * @param {Object} seedData - Data to seed the dialog with
     * @param {string} seedData.type - Goal type (usage, time, spending, health)
     * @param {number} seedData.currentAmount - Current amount (for quantifiable)
     * @param {number} seedData.goalAmount - Goal amount (for quantifiable)
     * @param {string} seedData.timeline - Measurement timeline (day, week, month)
     * @param {number} seedData.completionDays - Completion timeline in days
     * @param {string} seedData.wellnessText - Wellness goal text (for qualitative)
     * @param {number} seedData.mood - Initial mood value (for qualitative)
     */
    /**
     * Close create goal dialog
     */
    function closeCreateGoalDialog() {
        // Use UIModule to close dialog with overlay
        UIModule.closeClickDialog('.create-goal');
        
        // Reset form
        $('.goal-type-inputs').hide();
        $('.goal-completion-timeline').hide();
        $('.create-goal-submit').prop('disabled', true);
        // Reset inputs
        $('.create-goal input').val('');
        $('.create-goal textarea').val('');
        $('.create-goal select:not(#create-goal-type-select)').prop('selectedIndex', 0);
        $('.create-health-mood-tracker .smiley').removeClass('selected');
        $('.create-health-mood-tracker .smiley.mood-2').addClass('selected');
    }

    /**
     * Handle goal type selection change
     */
    function handleGoalTypeChange() {
        var selectedType = $('#create-goal-type-select').val();
        
        // Hide all input sections
        $('.goal-type-inputs').hide();
        
        // Show relevant input section
        if (selectedType === 'usage') {
            $('.usage-goal-inputs').show();
        } else if (selectedType === 'time') {
            $('.time-goal-inputs').show();
        } else if (selectedType === 'spending') {
            $('.spending-goal-inputs').show();
        } else if (selectedType === 'health') {
            $('.health-goal-inputs').show();
        }
        
        // Show completion timeline if a type is selected
        if (selectedType) {
            $('.goal-completion-timeline').show();
            $('.create-goal-submit').prop('disabled', false);
        } else {
            $('.goal-completion-timeline').hide();
            $('.create-goal-submit').prop('disabled', true);
        }
    }

    /**
     * Handle create goal form submission from dialog
     */
    function handleCreateGoalSubmit() {
        var selectedType = $('#create-goal-type-select').val();
        if (!selectedType) return;
        
        var completionTimeline = parseInt($('.create-completion-timeline-input').val()) || 7;
        var behavioralGoal = null;
        
        if (selectedType === 'usage') {
            var currentAmount = parseInt($('.create-amountDonePerWeek').val()) || 0;
            var goalAmount = parseInt($('.create-goalDonePerWeek').val()) || 0;
            var measurementTimeline = timelineToDays($('.create-usage-timeline-select').val());
            
            if (currentAmount === 0 && goalAmount === 0) {
                alert('Please enter current or goal usage amounts');
                return;
            }
            
            behavioralGoal = createQuantitativeGoal('times', currentAmount, goalAmount, measurementTimeline, completionTimeline);
            
        } else if (selectedType === 'time') {
            var currentHours = parseInt($('.create-currentTimeHours').val()) || 0;
            var currentMinutes = parseInt($('.create-currentTimeMinutes').val()) || 0;
            var goalHours = parseInt($('.create-goalTimeHours').val()) || 0;
            var goalMinutes = parseInt($('.create-goalTimeMinutes').val()) || 0;
            
            var currentAmount = (currentHours * 60) + currentMinutes;
            var goalAmount = (goalHours * 60) + goalMinutes;
            var measurementTimeline = timelineToDays($('.create-time-timeline-select').val());
            
            if (currentAmount === 0 && goalAmount === 0) {
                alert('Please enter current or goal time amounts');
                return;
            }
            
            behavioralGoal = createQuantitativeGoal('minutes', currentAmount, goalAmount, measurementTimeline, completionTimeline);
            
        } else if (selectedType === 'spending') {
            var currentAmount = parseInt($('.create-amountSpentPerWeek').val()) || 0;
            var goalAmount = parseInt($('.create-goalSpentPerWeek').val()) || 0;
            var measurementTimeline = timelineToDays($('.create-spending-timeline-select').val());
            
            if (currentAmount === 0 && goalAmount === 0) {
                alert('Please enter current or goal spending amounts');
                return;
            }
            
            behavioralGoal = createQuantitativeGoal('dollars', currentAmount, goalAmount, measurementTimeline, completionTimeline);
            
        } else if (selectedType === 'health') {
            var tenetText = $('.create-tenet-text').val();
            
            if (!tenetText || tenetText.trim() === '') {
                alert('Please enter your wellness goal');
                return;
            }
            
            var selectedMood = $('.create-health-mood-tracker .smiley.selected').data('mood');
            if (selectedMood === undefined) selectedMood = 2;
            
            behavioralGoal = createQualitativeGoal(tenetText, completionTimeline, selectedMood, '');
        }
        
        if (behavioralGoal) {
            closeCreateGoalDialog();
            // Navigate to goals tab and refresh list
            $('.goals-tab-toggler').click();
            setTimeout(function() {
                renderBehavioralGoalsList();
            }, 100);
            NotificationsModule.createNotification('Goal created successfully!', null, { type: 'goal_created' });
        }
    }

    /**
     * Set up event listeners for behavioral goal forms
     */
    function setupEventListeners() {
        // Goal submission from baseline questionnaire
        $(document).on('click', '.goal-question-set .submit', handleBehavioralGoalSubmit);
        
        // Mood smiley selection in health goal form (baseline)
        $(document).on('click', '.health-goal-questions .smiley', function() {
            $(this).closest('.smileys').find('.smiley').removeClass('selected');
            $(this).addClass('selected');
        });
        
        // Create goal button click (full-width button on goals page)
        $(document).on('click', '#create-goal-btn', function(e) {
            e.preventDefault();
            openCreateGoalDialog();
        });
        
        // Create goal button click (button bar)
        $(document).on('click', '#goal-button', function(e) {
            e.preventDefault();
            openCreateGoalDialog();
        });
        
        // Goal type dropdown change
        $(document).on('change', '#create-goal-type-select', handleGoalTypeChange);
        
        // Cancel button click
        $(document).on('click', '.create-goal-cancel', function(e) {
            e.preventDefault();
            closeCreateGoalDialog();
        });
        
        // Submit button click
        $(document).on('click', '.create-goal-submit', function(e) {
            e.preventDefault();
            handleCreateGoalSubmit();
        });
        
        // Mood smiley selection in create goal dialog
        $(document).on('click', '.create-health-mood-tracker .smiley', function() {
            $(this).closest('.smileys').find('.smiley').removeClass('selected');
            $(this).addClass('selected');
        });
    }

    /**
     * Initialize the module
     */
    function init(appJson) {
        json = appJson;
        setupEventListeners();
        
        // Refresh goals display every minute to update time-based stats
        // (days remaining, milestone times, etc.)
        setInterval(function() {
            if ($('#goals-accordion').length && $('#goals-accordion').is(':visible')) {
                updateDynamicStats();
            }
        }, 60000); // Every minute
    }
    
    /**
     * Update dynamic stats without full re-render.
     * Updates: days remaining, milestone times, track status
     */
    function updateDynamicStats() {
        $('.goal-accordion-item[data-goal-type="quantitative"]').each(function() {
            var $item = $(this);
            var goalId = $item.data('goal-id');
            var goal = getBehavioralGoalById(goalId);
            if (!goal) return;
            
            // Update days remaining
            var daysRemaining = calculateDaysRemaining(goal);
            $item.find('.goal-days-left').text(daysRemaining + ' days left');
            
            // Could also update milestone times here if needed
        });
    }

    // Public API
    return {
        init: init,
        createQuantitativeGoal: createQuantitativeGoal,
        createQualitativeGoal: createQualitativeGoal,
        createMoodRecordForBehavioralGoal: createMoodRecordForBehavioralGoal,
        getBehavioralGoals: getBehavioralGoals,
        getBehavioralGoalById: getBehavioralGoalById,
        getMoodRecordsForGoal: getMoodRecordsForGoal,
        renderBehavioralGoalsList: renderBehavioralGoalsList,
        timelineToDays: timelineToDays,
        openCreateGoalDialog: openCreateGoalDialog,
        closeCreateGoalDialog: closeCreateGoalDialog,
        populateGoalTypeDropdown: populateGoalTypeDropdown
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BehavioralGoalsModule;
} else {
    window.BehavioralGoalsModule = BehavioralGoalsModule;
}

