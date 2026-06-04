import { useState, useEffect, useRef, useCallback } from 'react';

export default function useRoundsTimer({ triggerMainAlarm, triggerInterimAlarm, requestWakeLock, releaseWakeLock }) {
    const [config, setConfig] = useState({
        prep: 10,
        round: 180,
        rest: 60,
        rounds: 3,
        interim: 30 // 0 means off
    });

    const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'paused' | 'done'
    const [phase, setPhase] = useState('prep'); // 'prep' | 'work' | 'rest'
    const [currentRound, setCurrentRound] = useState(1);
    const [timeRemaining, setTimeRemaining] = useState(config.prep * 1000);

    // Use refs for tick loop to avoid closure staleness
    const stateRef = useRef({
        status: 'idle',
        phase: 'prep',
        currentRound: 1,
        config,
        phaseEndTime: 0,
        pauseTimeLeft: 0,
        nextInterimTargetSecs: 0
    });

    const [nextInterimTarget, setNextInterimTarget] = useState(0);

    // Sync config to ref
    useEffect(() => {
        stateRef.current.config = config;
        if (stateRef.current.status === 'idle') {
            setTimeRemaining(config.prep > 0 ? config.prep * 1000 : config.round * 1000);
            setPhase(config.prep > 0 ? 'prep' : 'work');
            setCurrentRound(1);
            stateRef.current.phase = config.prep > 0 ? 'prep' : 'work';
            stateRef.current.currentRound = 1;
        }
    }, [config]);

    const transitionPhase = useCallback(() => {
        const s = stateRef.current;
        const c = s.config;

        if (s.phase === 'prep') {
            s.phase = 'work';
            s.phaseEndTime = Date.now() + c.round * 1000;
        } else if (s.phase === 'work') {
            if (s.currentRound >= c.rounds) {
                s.status = 'done';
                s.phase = 'done';
                s.phaseEndTime = 0;
            } else {
                s.phase = 'rest';
                s.phaseEndTime = Date.now() + c.rest * 1000;
            }
        } else if (s.phase === 'rest') {
            s.phase = 'work';
            s.currentRound += 1;
            s.phaseEndTime = Date.now() + c.round * 1000;
        }

        if (s.phase === 'work' && c.interim > 0) {
            s.nextInterimTargetSecs = c.round - c.interim;
        } else {
            s.nextInterimTargetSecs = 0;
        }

        setStatus(s.status);
        setPhase(s.phase);
        setCurrentRound(s.currentRound);
        setNextInterimTarget(s.nextInterimTargetSecs);

        if (s.status === 'done') {
            setTimeRemaining(0);
            releaseWakeLock();
        } else {
            setTimeRemaining(Math.max(0, s.phaseEndTime - Date.now()));
        }
    }, [releaseWakeLock]);

    const tick = useCallback(() => {
        const s = stateRef.current;
        if (s.status !== 'running') return;

        const now = Date.now();
        const remainingMs = Math.max(0, s.phaseEndTime - now);

        // Interim alarm logic (only in work phase)
        if (s.phase === 'work' && s.config.interim > 0) {
            const remainingSecs = Math.ceil(remainingMs / 1000);
            if (s.nextInterimTargetSecs > 0 && remainingSecs <= s.nextInterimTargetSecs && remainingSecs > 0) {
                triggerInterimAlarm();
                s.nextInterimTargetSecs = remainingSecs - (remainingSecs % s.config.interim);
                if (s.nextInterimTargetSecs === remainingSecs) {
                    s.nextInterimTargetSecs -= s.config.interim;
                }
                setNextInterimTarget(s.nextInterimTargetSecs);
            }
        }

        setTimeRemaining(remainingMs);

        if (remainingMs <= 0) {
            triggerMainAlarm();
            transitionPhase();
        }
    }, [transitionPhase, triggerMainAlarm, triggerInterimAlarm]);

    useEffect(() => {
        let intervalId;
        if (status === 'running') {
            intervalId = setInterval(tick, 100); // 100ms for smooth UI, but driven by Date.now()
        }
        return () => clearInterval(intervalId);
    }, [status, tick]);

    const start = useCallback(() => {
        const s = stateRef.current;
        if (s.status === 'running') return;

        requestWakeLock();
        
        if (s.status === 'idle') {
            s.phase = s.config.prep > 0 ? 'prep' : 'work';
            s.currentRound = 1;
            const durationSecs = s.phase === 'prep' ? s.config.prep : s.config.round;
            s.phaseEndTime = Date.now() + durationSecs * 1000;
            if (s.phase === 'work' && s.config.interim > 0) {
                s.nextInterimTargetSecs = s.config.round - s.config.interim;
            } else {
                s.nextInterimTargetSecs = 0;
            }
        } else if (s.status === 'paused') {
            s.phaseEndTime = Date.now() + s.pauseTimeLeft;
        }

        s.status = 'running';
        setStatus('running');
        setPhase(s.phase);
        setCurrentRound(s.currentRound);
        setNextInterimTarget(s.nextInterimTargetSecs);
        setTimeRemaining(Math.max(0, s.phaseEndTime - Date.now()));
    }, [requestWakeLock]);

    const pause = useCallback(() => {
        const s = stateRef.current;
        if (s.status !== 'running') return;

        s.status = 'paused';
        s.pauseTimeLeft = Math.max(0, s.phaseEndTime - Date.now());
        setStatus('paused');
        releaseWakeLock();
    }, [releaseWakeLock]);

    const reset = useCallback(() => {
        const s = stateRef.current;
        s.status = 'idle';
        s.phase = s.config.prep > 0 ? 'prep' : 'work';
        s.currentRound = 1;
        s.pauseTimeLeft = 0;
        s.nextInterimTargetSecs = 0;
        
        setStatus('idle');
        setPhase(s.phase);
        setCurrentRound(s.currentRound);
        setNextInterimTarget(s.nextInterimTargetSecs);
        setTimeRemaining(s.phase === 'prep' ? s.config.prep * 1000 : s.config.round * 1000);
        releaseWakeLock();
    }, [releaseWakeLock]);

    const loadSetup = useCallback((setup) => {
        reset();
        setConfig(setup);
    }, [reset]);

    return {
        config,
        setConfig,
        status,
        phase,
        currentRound,
        timeRemaining,
        nextInterimTarget,
        start,
        pause,
        reset,
        loadSetup
    };
}
