/**
 * BehavioralGoalsModule
 * Handles quantitative and qualitative behavioral goals
 * (distinct from the delayed gratification "wait" goals in GoalsModule)
 */
var BehavioralGoalsModule = (function () {
    // Private variables
    var json;

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
     */
    function saveBehavioralGoal(behavioralGoal) {
        var jsonObject = StorageModule.retrieveStorageObject();
        
        // Initialize behavioralGoals array if it doesn't exist
        if (!jsonObject.behavioralGoals) {
            jsonObject.behavioralGoals = [];
        }
        
        jsonObject.behavioralGoals.push(behavioralGoal);
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
     * Render the behavioral goals list in the goals tab
     */
    function renderBehavioralGoalsList() {
        var goals = getBehavioralGoals();
        var container = $('#behavioral-goals-list');
        
        if (goals.length === 0) {
            container.html('<p class="text-center text-muted">No behavioral goals created yet. Create your first goal in the Baseline tab.</p>');
            return;
        }
        
        var html = '';
        goals.forEach(function(goal) {
            html += renderBehavioralGoalCard(goal);
        });
        
        container.html(html);
    }

    /**
     * Render a single behavioral goal card
     */
    function renderBehavioralGoalCard(goal) {
        var statusClass = goal.status === 'active' ? 'behavioral-goal-active' : 'behavioral-goal-' + goal.status;
        var createdDate = new Date(goal.createdAt).toLocaleDateString();
        
        if (goal.type === 'quantitative') {
            var unitLabel = goal.unit === 'times' ? 'times' : (goal.unit === 'minutes' ? 'min' : '$');
            var periodLabel = goal.measurementTimeline === 1 ? 'day' : (goal.measurementTimeline === 7 ? 'week' : 'month');
            
            return '<div class="behavioral-goal-card ' + statusClass + '" data-behavioral-goal-id="' + goal.id + '">' +
                '<div class="behavioral-goal-header">' +
                    '<span class="behavioral-goal-type-badge quantitative">' + goal.unit + '</span>' +
                    '<span class="behavioral-goal-status">' + goal.status + '</span>' +
                '</div>' +
                '<div class="behavioral-goal-body">' +
                    '<p class="behavioral-goal-metric">From <strong>' + goal.currentAmount + '</strong> to <strong>' + goal.goalAmount + '</strong> ' + unitLabel + ' per ' + periodLabel + '</p>' +
                    '<p class="behavioral-goal-timeline">Target: ' + goal.completionTimeline + ' days</p>' +
                '</div>' +
                '<div class="behavioral-goal-footer">' +
                    '<span class="behavioral-goal-created">Created ' + createdDate + '</span>' +
                '</div>' +
            '</div>';
        } else {
            // Qualitative goal
            return '<div class="behavioral-goal-card ' + statusClass + '" data-behavioral-goal-id="' + goal.id + '">' +
                '<div class="behavioral-goal-header">' +
                    '<span class="behavioral-goal-type-badge qualitative">wellness</span>' +
                    '<span class="behavioral-goal-status">' + goal.status + '</span>' +
                '</div>' +
                '<div class="behavioral-goal-body">' +
                    '<p class="behavioral-goal-tenet">"' + escapeHtml(goal.tenetText) + '"</p>' +
                    '<p class="behavioral-goal-timeline">Target: ' + goal.completionTimeline + ' days</p>' +
                '</div>' +
                '<div class="behavioral-goal-footer">' +
                    '<span class="behavioral-goal-created">Created ' + createdDate + '</span>' +
                '</div>' +
            '</div>';
        }
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
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 30;
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
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 30;
            data.unit = 'minutes';
            
            if (data.currentAmount === 0 && data.goalAmount === 0) {
                errors.push('Please enter current or goal time amounts');
            }
        } else if (goalType === 'spending') {
            data.currentAmount = parseInt(questionSetElement.find('.amountSpentPerWeek').val()) || 0;
            data.goalAmount = parseInt(questionSetElement.find('.goalSpentPerWeek').val()) || 0;
            data.measurementTimeline = timelineToDays(questionSetElement.find('.spending-timeline-select').val());
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 30;
            data.unit = 'dollars';
            
            if (data.currentAmount === 0 && data.goalAmount === 0) {
                errors.push('Please enter current or goal spending amounts');
            }
        } else if (goalType === 'health') {
            data.tenetText = questionSetElement.find('.tenet-text').val();
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 30;
            
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
     * Set up event listeners for behavioral goal forms
     */
    function setupEventListeners() {
        // Goal submission
        $(document).on('click', '.goal-question-set .submit', handleBehavioralGoalSubmit);
        
        // Mood smiley selection in health goal form
        $(document).on('click', '.health-goal-questions .smiley', function() {
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
    }

    // Public API
    return {
        init: init,
        createQuantitativeGoal: createQuantitativeGoal,
        createQualitativeGoal: createQualitativeGoal,
        createMoodRecordForBehavioralGoal: createMoodRecordForBehavioralGoal,
        getBehavioralGoals: getBehavioralGoals,
        getBehavioralGoalById: getBehavioralGoalById,
        renderBehavioralGoalsList: renderBehavioralGoalsList,
        timelineToDays: timelineToDays
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BehavioralGoalsModule;
} else {
    window.BehavioralGoalsModule = BehavioralGoalsModule;
}

