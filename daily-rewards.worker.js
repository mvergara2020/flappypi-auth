/* =========================================================
   FLAPPYPI - DAILY REWARDS WORKER MODULE
========================================================= */

const DAILY_REWARD_TABLE = Object.freeze([
    { day: 1,  coins: 75,  spins: 0 },
    { day: 2,  coins: 75,  spins: 0 },
    { day: 3,  coins: 100, spins: 0 },
    { day: 4,  coins: 100, spins: 0 },
    { day: 5,  coins: 125, spins: 0 },
    { day: 6,  coins: 125, spins: 0 },
    { day: 7,  coins: 150, spins: 1 },
  
    { day: 8,  coins: 100, spins: 0 },
    { day: 9,  coins: 100, spins: 0 },
    { day: 10, coins: 125, spins: 0 },
    { day: 11, coins: 125, spins: 0 },
    { day: 12, coins: 150, spins: 0 },
    { day: 13, coins: 150, spins: 0 },
    { day: 14, coins: 200, spins: 1 },
  
    { day: 15, coins: 125, spins: 0 },
    { day: 16, coins: 125, spins: 0 },
    { day: 17, coins: 150, spins: 0 },
    { day: 18, coins: 150, spins: 0 },
    { day: 19, coins: 175, spins: 0 },
    { day: 20, coins: 175, spins: 0 },
    { day: 21, coins: 250, spins: 1 },
  
    { day: 22, coins: 150, spins: 0 },
    { day: 23, coins: 150, spins: 0 },
    { day: 24, coins: 175, spins: 0 },
    { day: 25, coins: 175, spins: 0 },
    { day: 26, coins: 200, spins: 0 },
    { day: 27, coins: 200, spins: 0 },
    { day: 28, coins: 300, spins: 1 },
  
    { day: 29, coins: 300, spins: 0 },
    { day: 30, coins: 500, spins: 2 }
  ]);
  
  function dailyJson(
    data,
    status,
    request,
    corsHeaders
  ) {
    return new Response(
      JSON.stringify(data),
      {
        status,
        headers: {
          ...corsHeaders(request),
          "Content-Type":
            "application/json; charset=utf-8",
  
          "Cache-Control":
            "no-store, no-cache, must-revalidate"
        }
      }
    );
  }
  
  function getUtcDateKey(
    timestamp = Date.now()
  ) {
    return new Date(timestamp)
      .toISOString()
      .slice(0, 10);
  }
  
  function getNextUtcMidnight(
    timestamp = Date.now()
  ) {
    const date = new Date(timestamp);
  
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1,
      0,
      0,
      0,
      0
    );
  }
  
  function getRewardByDay(day) {
    return DAILY_REWARD_TABLE.find(
      reward =>
        Number(reward.day) === Number(day)
    ) || null;
  }
  
  async function ensureDailyRewardState(
    env,
    userId
  ) {
    const now = Date.now();
  
    await env.DB.prepare(`
      INSERT OR IGNORE INTO daily_reward_state (
        user_id,
        current_day,
        cycle_no,
        last_claim_date,
        created_at,
        updated_at
      )
      VALUES (?, 0, 1, NULL, ?, ?)
    `)
      .bind(
        userId,
        now,
        now
      )
      .run();
  }
  
  async function readDailyRewardState(
    env,
    userId
  ) {
    return env.DB.prepare(`
      SELECT
        user_id,
        current_day,
        cycle_no,
        last_claim_date,
        created_at,
        updated_at
      FROM daily_reward_state
      WHERE user_id = ?
      LIMIT 1
    `)
      .bind(userId)
      .first();
  }
  
  async function buildDailyRewardStatus(
    env,
    userId
  ) {
    await ensureDailyRewardState(
      env,
      userId
    );
  
    const [state, user] =
      await Promise.all([
        readDailyRewardState(
          env,
          userId
        ),
  
        env.DB.prepare(`
          SELECT
            eggs,
            free_spins
          FROM users
          WHERE id = ?
          LIMIT 1
        `)
          .bind(userId)
          .first()
      ]);
  
    const now = Date.now();
    const today = getUtcDateKey(now);
  
    const completedDays = Math.max(
      0,
      Math.min(
        30,
        Number(state?.current_day || 0)
      )
    );
  
    const currentCycle = Math.max(
      1,
      Number(state?.cycle_no || 1)
    );
  
    const claimedToday =
      state?.last_claim_date === today;
  
    const claimable =
      !claimedToday;
  
    const cycleFinished =
      completedDays >= 30;
  
    const nextDay =
      cycleFinished
        ? 1
        : completedDays + 1;
  
    const nextCycle =
      cycleFinished
        ? currentCycle + 1
        : currentCycle;
  
    const currentReward =
      getRewardByDay(nextDay);
  
    return {
      ok: true,
  
      claimable,
      claimed_today: claimedToday,
  
      cycle:
        claimable
          ? nextCycle
          : currentCycle,
  
      completed_days: completedDays,
  
      next_day: nextDay,
  
      current_reward: currentReward,
  
      cycle_complete:
        cycleFinished,
  
      next_claim_at:
        claimable
          ? now
          : getNextUtcMidnight(now),
  
      server_time: now,
  
      eggs:
        Number(user?.eggs || 0),
  
      free_spins:
        Number(user?.free_spins || 0),
  
      totals: {
        coins: 5000,
        spins: 6,
        days: 30
      },
  
      rewards:
        DAILY_REWARD_TABLE
    };
  }
  
  async function handleDailyRewardStatus(
    request,
    env,
    helpers
  ) {
    const {
      requireUser,
      corsHeaders
    } = helpers;
  
    const user =
      await requireUser(request, env);
  
    if (!user) {
      return dailyJson(
        {
          ok: false,
          error: "UNAUTHORIZED"
        },
        401,
        request,
        corsHeaders
      );
    }
  
    const status =
      await buildDailyRewardStatus(
        env,
        user.id
      );
  
    return dailyJson(
      status,
      200,
      request,
      corsHeaders
    );
  }
  function buildDailyRewardSpinStatements(
    env,
    {
      userId,
      spinCount,
      rewardCycle,
      rewardDay,
      claimId,
      createdAt
    }
  ) {
    const statements = [];
  
    const totalSpins = Math.max(
      0,
      Number(spinCount || 0)
    );
  
    for (
      let spinIndex = 0;
      spinIndex < totalSpins;
      spinIndex++
    ) {
      const spinId = crypto.randomUUID();
  
      const source = [
        "daily_reward",
        `cycle_${rewardCycle}`,
        `day_${rewardDay}`,
        claimId
      ].join("_");
  
      statements.push(
        env.DB.prepare(`
          INSERT INTO spins (
            id,
            user_id,
            game_uid,
            status,
            reward_json,
            created_at,
            claimed_at,
            source
          )
          VALUES (
            ?,
            ?,
            NULL,
            'PENDING',
            NULL,
            ?,
            NULL,
            ?
          )
        `).bind(
          spinId,
          userId,
  
          /*
           * + spinIndex conserva un orden FIFO
           * diferente si el Día 30 entrega 2 spins.
           */
          createdAt + spinIndex,
  
          source
        )
      );
    }
  
    return statements;
  }
  async function handleDailyRewardClaim(
    request,
    env,
    helpers
  ) {
    const {
      requireUser,
      corsHeaders
    } = helpers;
  
    const user =
      await requireUser(request, env);
  
    if (!user) {
      return dailyJson(
        {
          ok: false,
          error: "UNAUTHORIZED"
        },
        401,
        request,
        corsHeaders
      );
    }
  
    await ensureDailyRewardState(
      env,
      user.id
    );
  
    const state =
      await readDailyRewardState(
        env,
        user.id
      );
  
    const now = Date.now();
    const today = getUtcDateKey(now);
  
    if (
      state?.last_claim_date === today
    ) {
      const status =
        await buildDailyRewardStatus(
          env,
          user.id
        );
  
      return dailyJson(
        {
          ok: false,
          error: "ALREADY_CLAIMED_TODAY",
          message:
            "Today's reward was already claimed.",
          status
        },
        409,
        request,
        corsHeaders
      );
    }
  
    const currentDay = Math.max(
      0,
      Math.min(
        30,
        Number(state?.current_day || 0)
      )
    );
  
    const currentCycle = Math.max(
      1,
      Number(state?.cycle_no || 1)
    );
  
    const rewardDay =
    currentDay >= 30
      ? 1
      : currentDay + 1;
  
  const rewardCycle =
    currentDay >= 30
      ? currentCycle + 1
      : currentCycle;
  
  const reward =
    getRewardByDay(rewardDay);
  
  if (!reward) {
    return dailyJson(
      {
        ok: false,
        error: "REWARD_NOT_FOUND"
      },
      500,
      request,
      corsHeaders
    );
  }
  
  /*
   * El Día 30 pertenece al ciclo actual,
   * pero después de reclamarlo dejamos preparado
   * inmediatamente el ciclo siguiente.
   */
  const completedCycle =
    rewardDay === 30;
  
  const stateDayAfterClaim =
    completedCycle
      ? 0
      : rewardDay;
  
  const stateCycleAfterClaim =
    completedCycle
      ? rewardCycle + 1
      : rewardCycle;
  
    if (!reward) {
      return dailyJson(
        {
          ok: false,
          error: "REWARD_NOT_FOUND"
        },
        500,
        request,
        corsHeaders
      );
    }
  
    const claimId =
      crypto.randomUUID();
  
    try {
      const rewardCoins = Math.max(
        0,
        Number(reward.coins || 0)
      );
      
      const rewardSpins = Math.max(
        0,
        Number(reward.spins || 0)
      );
      
      const statements = [
        /*
         * 1. Registrar el reclamo diario.
         */
        env.DB.prepare(`
          INSERT INTO daily_reward_claims (
            id,
            user_id,
            cycle_no,
            reward_day,
            claim_date_utc,
            coins,
            spins,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          claimId,
          user.id,
          rewardCycle,
          rewardDay,
          today,
          rewardCoins,
          rewardSpins,
          now
        ),
      
        /*
         * 2. Acreditar monedas y contador de spins.
         */
        env.DB.prepare(`
          UPDATE users
          SET
            eggs =
              COALESCE(eggs, 0) + ?,
      
            free_spins =
              COALESCE(free_spins, 0) + ?
          WHERE id = ?
        `).bind(
          rewardCoins,
          rewardSpins,
          user.id
        ),
      
        /*
         * 3. Actualizar progreso diario.
         */
        env.DB.prepare(`
          UPDATE daily_reward_state
          SET
            current_day = ?,
            cycle_no = ?,
            last_claim_date = ?,
            updated_at = ?
          WHERE user_id = ?
            AND (
              last_claim_date IS NULL
              OR last_claim_date <> ?
            )
        `).bind(
          stateDayAfterClaim,
          stateCycleAfterClaim,
          today,
          now,
          user.id,
          today
        )
      ];
      
      /*
       * 4. Crear una fila PENDING por cada spin recibido.
       */
      statements.push(
        ...buildDailyRewardSpinStatements(
          env,
          {
            userId: user.id,
            spinCount: rewardSpins,
            rewardCycle,
            rewardDay,
            claimId,
            createdAt: now
          }
        )
      );
      
      /*
       * Todo queda en la misma operación.
       * Si falla un insert de spin, no se acredita
       * parcialmente la recompensa.
       */
      await env.DB.batch(statements);
  
    } catch (error) {
      const message =
        String(error?.message || error);
  
      if (
        message.includes("UNIQUE") ||
        message.includes("constraint")
      ) {
        const status =
          await buildDailyRewardStatus(
            env,
            user.id
          );
  
        return dailyJson(
          {
            ok: false,
            error:
              "ALREADY_CLAIMED_TODAY",
            message:
              "Today's reward was already claimed.",
            status
          },
          409,
          request,
          corsHeaders
        );
      }
  
      console.error(
        "[DAILY REWARD CLAIM ERROR]",
        error
      );
  
      return dailyJson(
        {
          ok: false,
          error: "DAILY_REWARD_FAILED",
          message:
            "The reward could not be claimed."
        },
        500,
        request,
        corsHeaders
      );
    }
  
    const updatedUser =
      await env.DB.prepare(`
        SELECT
          eggs,
          free_spins
        FROM users
        WHERE id = ?
        LIMIT 1
      `)
        .bind(user.id)
        .first();
  
    const status =
      await buildDailyRewardStatus(
        env,
        user.id
      );
  
    return dailyJson(
      {
        ok: true,
  
        claim_id: claimId,
  
        claimed_reward: reward,
  
        eggs:
          Number(updatedUser?.eggs || 0),
  
        free_spins:
          Number(
            updatedUser?.free_spins || 0
          ),
  
        status
      },
      200,
      request,
      corsHeaders
    );
  }
  
  /* =========================================================
     ROUTER
  ========================================================= */
  
  export async function routeDailyRewards(
    request,
    env,
    helpers
  ) {
    const url = new URL(request.url);
  
    if (
      request.method === "GET" &&
      url.pathname ===
        "/daily-rewards/status"
    ) {
      return handleDailyRewardStatus(
        request,
        env,
        helpers
      );
    }
  
    if (
      request.method === "POST" &&
      url.pathname ===
        "/daily-rewards/claim"
    ) {
      return handleDailyRewardClaim(
        request,
        env,
        helpers
      );
    }
  
    return null;
  }