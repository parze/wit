const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/teacher/courses/:id/progress - get full progress for a course
router.get('/courses/:id/progress', authMiddleware, requireRole('teacher'), async (req, res) => {
  const { id } = req.params;

  try {
    const course = await db('courses').where({ id }).first();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    // Get all enrolled students
    const enrollments = await db('enrollments')
      .join('users', 'enrollments.student_id', 'users.id')
      .where('enrollments.course_id', id)
      .select(
        'users.id',
        'users.name',
        'users.email',
        'enrollments.created_at as enrolled_at'
      );

    // For each student build progress data directly per course
    const studentsProgress = await Promise.all(
      enrollments.map(async (student) => {
        const [progress, aiSummary, starsCount] = await Promise.all([
          db('section_progress').where({ student_id: student.id, course_id: id }).first(),
          db('ai_summaries').where({ student_id: student.id, course_id: id }).first(),
          db('section_stars').where({ student_id: student.id, course_id: id }).count('id as count').first(),
        ]);

        return {
          student: {
            id: student.id,
            name: student.name,
            email: student.email,
            enrolledAt: student.enrolled_at,
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
      studentsProgress,
    });
  } catch (err) {
    console.error('Teacher progress error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
