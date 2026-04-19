const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/parent/courses/:id/progress - get full progress for a course
router.get('/courses/:id/progress', authMiddleware, requireRole('parent'), async (req, res) => {
  const { id } = req.params;

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.parent_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    // Get all enrolled children
    const enrollments = await db('enrollments')
      .join('users', 'enrollments.child_id', 'users.id')
      .where('enrollments.course_id', id)
      .select(
        'users.id',
        'users.name',
        'users.username',
        'enrollments.created_at as enrolled_at'
      );

    // For each child build progress data
    const childrenProgress = await Promise.all(
      enrollments.map(async (child) => {
        const [progress, aiSummary, starsCount] = await Promise.all([
          db('section_progress').where({ child_id: child.id, course_id: id }).first(),
          db('ai_summaries').where({ child_id: child.id, course_id: id }).first(),
          db('section_stars').where({ child_id: child.id, course_id: id }).count('id as count').first(),
        ]);

        return {
          child: {
            id: child.id,
            name: child.name,
            username: child.username,
            enrolledAt: child.enrolled_at,
          },
          status: progress ? progress.status : 'not_started',
          stars: parseInt(starsCount?.count ?? 0),
          aiSummary: aiSummary
            ? {
                summary: aiSummary.summary,
                goalAchievement: aiSummary.goal_achievement,
                reasons: aiSummary.reasons,
                updatedAt: aiSummary.updated_at,
              }
            : null,
        };
      })
    );

    return res.json({
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
      },
      childrenProgress,
    });
  } catch (err) {
    console.error('Parent progress error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
