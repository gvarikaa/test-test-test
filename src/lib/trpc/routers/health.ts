import { z } from 'zod';
import { router, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';

export const healthRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const healthProfile = await ctx.db.healthProfile.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        progressRecords: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    return healthProfile;
  }),

  createProfile: protectedProcedure
    .input(
      z.object({
        age: z.number().min(13).max(120).optional(),
        weight: z.number().positive().optional(),
        height: z.number().positive().optional(),
        gender: z.string().optional(),
        activityLevel: z.string().optional(),
        goals: z.string().optional(),
        dietaryRestrictions: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingProfile = await ctx.db.healthProfile.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (existingProfile) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Health profile already exists',
        });
      }

      const profile = await ctx.db.healthProfile.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
        },
      });

      return profile;
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        age: z.number().min(13).max(120).optional(),
        weight: z.number().positive().optional(),
        height: z.number().positive().optional(),
        gender: z.string().optional(),
        activityLevel: z.string().optional(),
        goals: z.string().optional(),
        dietaryRestrictions: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingProfile = await ctx.db.healthProfile.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!existingProfile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Health profile not found',
        });
      }

      const profile = await ctx.db.healthProfile.update({
        where: { userId: ctx.session.user.id },
        data: input,
      });

      return profile;
    }),

  addProgressRecord: protectedProcedure
    .input(
      z.object({
        weight: z.number().positive().optional(),
        energyLevel: z.number().min(1).max(10).optional(),
        sleepQuality: z.number().min(1).max(10).optional(),
        notes: z.string().max(500).optional(),
        photoUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.healthProfile.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!profile) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Please create a health profile first',
        });
      }

      const record = await ctx.db.progressRecord.create({
        data: {
          ...input,
          profileId: profile.id,
        },
      });

      return record;
    }),

  createMealPlan: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        startDate: z.date(),
        endDate: z.date().optional(),
        meals: z.array(
          z.object({
            name: z.string().min(1),
            type: z.string(),
            calories: z.number().optional(),
            protein: z.number().optional(),
            carbs: z.number().optional(),
            fat: z.number().optional(),
            recipe: z.string().optional(),
            imageUrl: z.string().url().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { meals, ...planData } = input;

      const profile = await ctx.db.healthProfile.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!profile) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Please create a health profile first',
        });
      }

      const plan = await ctx.db.mealPlan.create({
        data: {
          ...planData,
          profileId: profile.id,
          meals: meals
            ? {
                createMany: {
                  data: meals,
                },
              }
            : undefined,
        },
        include: {
          meals: true,
        },
      });

      return plan;
    }),

  createWorkoutPlan: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        startDate: z.date(),
        endDate: z.date().optional(),
        workouts: z.array(
          z.object({
            name: z.string().min(1),
            duration: z.number().optional(),
            type: z.string(),
            description: z.string().optional(),
            videoUrl: z.string().url().optional(),
            exercises: z.array(
              z.object({
                name: z.string().min(1),
                sets: z.number().optional(),
                reps: z.number().optional(),
                duration: z.number().optional(),
                restTime: z.number().optional(),
                notes: z.string().optional(),
              })
            ).optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { workouts, ...planData } = input;

      const profile = await ctx.db.healthProfile.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!profile) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Please create a health profile first',
        });
      }

      const plan = await ctx.db.workoutPlan.create({
        data: {
          ...planData,
          profileId: profile.id,
        },
        include: {
          workouts: {
            include: {
              exercises: true,
            },
          },
        },
      });

      // Add workouts and exercises if provided
      if (workouts && workouts.length > 0) {
        for (const workoutData of workouts) {
          const { exercises, ...rest } = workoutData;
          
          const workout = await ctx.db.workout.create({
            data: {
              ...rest,
              planId: plan.id,
            },
          });

          if (exercises && exercises.length > 0) {
            await ctx.db.workoutExercise.createMany({
              data: exercises.map(exercise => ({
                ...exercise,
                workoutId: workout.id,
              })),
            });
          }
        }
      }

      return plan;
    }),

  getMealPlans: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.healthProfile.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!profile) {
      return [];
    }

    const plans = await ctx.db.mealPlan.findMany({
      where: { profileId: profile.id },
      include: {
        meals: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return plans;
  }),

  getWorkoutPlans: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.healthProfile.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!profile) {
      return [];
    }

    const plans = await ctx.db.workoutPlan.findMany({
      where: { profileId: profile.id },
      include: {
        workouts: {
          include: {
            exercises: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return plans;
  }),
});