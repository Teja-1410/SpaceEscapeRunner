import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const SHIP_WIDTH = 60;
const SHIP_HEIGHT = 60;
const SHIP_BOTTOM_OFFSET = 120;

const ASTEROID_SIZE = 44;
const FALL_SPEED = 6;
const TICK_INTERVAL = 50;

const MOVE_STEP = 30;

const SHIP_TOP = SCREEN_HEIGHT - SHIP_BOTTOM_OFFSET - SHIP_HEIGHT;
const SHIP_BOTTOM = SCREEN_HEIGHT - SHIP_BOTTOM_OFFSET;

const HIGH_SCORE_KEY = 'SPACE_ESCAPE_HIGH_SCORE';

const randomX = () => Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE);

const getInitialShipPosition = () => SCREEN_WIDTH / 2 - SHIP_WIDTH / 2;
const getInitialAsteroid = () => ({ x: randomX(), y: -ASTEROID_SIZE });

export default function HomeScreen() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [shipPosition, setShipPosition] = useState(getInitialShipPosition());
  const [asteroid, setAsteroid] = useState(getInitialAsteroid());
  const [gameOver, setGameOver] = useState(false);

  const shipPositionRef = useRef(shipPosition);
  const gameOverRef = useRef(gameOver);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ----- Animated values -----
  const shipAnim = useRef(new Animated.Value(getInitialShipPosition())).current;
  const asteroidRotation = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    shipPositionRef.current = shipPosition;
    Animated.spring(shipAnim, {
      toValue: shipPosition,
      useNativeDriver: false,
      friction: 6,
      tension: 60,
    }).start();
  }, [shipPosition]);

  useEffect(() => {
    gameOverRef.current = gameOver;
    if (gameOver && intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    Animated.timing(overlayOpacity, {
      toValue: gameOver ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [gameOver]);

  // ----- Continuous asteroid spin -----
  useEffect(() => {
    Animated.loop(
      Animated.timing(asteroidRotation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = asteroidRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const savedValue = await AsyncStorage.getItem(HIGH_SCORE_KEY);
        if (savedValue !== null) {
          setHighScore(parseInt(savedValue, 10));
        }
      } catch (error) {
        console.log('Failed to load high score:', error);
      }
    };
    loadHighScore();
  }, []);

  const saveHighScore = async (newHighScore: number) => {
    try {
      await AsyncStorage.setItem(HIGH_SCORE_KEY, newHighScore.toString());
    } catch (error) {
      console.log('Failed to save high score:', error);
    }
  };

  const tick = () => {
    if (gameOverRef.current) return;

    setAsteroid((prevAsteroid) => {
      const newY = prevAsteroid.y + FALL_SPEED;

      const shipLeft = shipPositionRef.current;
      const shipRight = shipLeft + SHIP_WIDTH;

      const hitHorizontally =
        prevAsteroid.x < shipRight && prevAsteroid.x + ASTEROID_SIZE > shipLeft;
      const hitVertically =
        newY < SHIP_BOTTOM && newY + ASTEROID_SIZE > SHIP_TOP;

      const collided = hitHorizontally && hitVertically;

      if (collided) {
        setGameOver(true);
        return prevAsteroid;
      }

      if (newY > SCREEN_HEIGHT) {
        setScore((prevScore) => {
          const newScore = prevScore + 1;
          setHighScore((prevHighScore) => {
            if (newScore > prevHighScore) {
              saveHighScore(newScore);
              return newScore;
            }
            return prevHighScore;
          });
          return newScore;
        });
        return { x: randomX(), y: -ASTEROID_SIZE };
      }

      return { x: prevAsteroid.x, y: newY };
    });
  };

  useEffect(() => {
    intervalRef.current = setInterval(tick, TICK_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startGame = () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    setScore(0);
    setGameOver(false);
    setShipPosition(getInitialShipPosition());
    setAsteroid(getInitialAsteroid());

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, TICK_INTERVAL);
  };

  const moveLeft = () => {
    if (gameOver) return;
    setShipPosition((prev) => Math.max(prev - MOVE_STEP, 0));
  };

  const moveRight = () => {
    if (gameOver) return;
    setShipPosition((prev) =>
      Math.min(prev + MOVE_STEP, SCREEN_WIDTH - SHIP_WIDTH)
    );
  };

  return (
    <LinearGradient
      colors={['#0B0E23', '#1B1F4B', '#2A1B4D']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      <Text style={styles.title}>Space Escape Runner</Text>

      <View style={styles.scoreRow}>
        <LinearGradient colors={['#1B1F3B', '#232849']} style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </LinearGradient>

        <LinearGradient colors={['#1B1F3B', '#232849']} style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>HIGH SCORE</Text>
          <Text style={styles.highScoreValue}>{highScore}</Text>
        </LinearGradient>
      </View>

      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <TouchableOpacity onPress={startGame} activeOpacity={0.85}>
          <LinearGradient
            colors={['#00E0FF', '#00A6FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {gameOver ? 'Restart Game' : 'Start Game'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Asteroid */}
      <Animated.View
        style={[
          styles.asteroid,
          { left: asteroid.x, top: asteroid.y, transform: [{ rotate: spin }] },
        ]}
      >
        <LinearGradient
          colors={['#A6845C', '#6B4F3A']}
          style={styles.asteroidGradient}
        >
          <View style={styles.craterOne} />
          <View style={styles.craterTwo} />
          <View style={styles.craterThree} />
        </LinearGradient>
      </Animated.View>

      {/* Spaceship */}
      <Animated.View style={[styles.spaceship, { left: shipAnim }]}>
        <View style={styles.shipGlow} />
        <View style={styles.shipNose} />
        <LinearGradient
          colors={['#FFFFFF', '#C7D6FF']}
          style={styles.shipBody}
        />
        <View style={styles.shipWindow} />
        <View style={styles.shipFinsRow}>
          <View style={styles.shipFinLeft} />
          <View style={styles.shipFinRight} />
        </View>
        <View style={styles.shipThruster} />
      </Animated.View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={moveLeft} activeOpacity={0.7}>
          <Text style={styles.controlButtonText}>◀ Left</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={moveRight} activeOpacity={0.7}>
          <Text style={styles.controlButtonText}>Right ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Game Over overlay */}
      {gameOver && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Text style={styles.gameOverText}>GAME OVER</Text>
          <Text style={styles.finalScoreText}>Final Score: {score}</Text>
          <Text style={styles.finalHighScoreText}>Best: {highScore}</Text>
          <TouchableOpacity onPress={startGame} activeOpacity={0.85}>
            <LinearGradient
              colors={['#00E0FF', '#00A6FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Play Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 26,
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: '#00E0FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 34,
  },
  scoreBox: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 18,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(0, 224, 255, 0.25)',
  },
  scoreLabel: {
    color: '#8A8FBF',
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  scoreValue: {
    color: '#00E0FF',
    fontSize: 38,
    fontWeight: 'bold',
  },
  highScoreValue: {
    color: '#FFD93D',
    fontSize: 38,
    fontWeight: 'bold',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 30,
    shadowColor: '#00E0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    color: '#0B0E23',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // ----- Spaceship -----
  spaceship: {
    position: 'absolute',
    bottom: SHIP_BOTTOM_OFFSET,
    width: SHIP_WIDTH,
    alignItems: 'center',
  },
  shipGlow: {
    position: 'absolute',
    top: -6,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00E0FF',
    opacity: 0.25,
  },
  shipNose: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 25,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#00E0FF',
  },
  shipBody: {
    width: 32,
    height: 34,
    borderRadius: 10,
    marginTop: -2,
  },
  shipWindow: {
    position: 'absolute',
    top: 22,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0B0E23',
    borderWidth: 2,
    borderColor: '#00E0FF',
  },
  shipFinsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 62,
    marginTop: -10,
  },
  shipFinLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 20,
    borderRightWidth: 16,
    borderTopColor: 'transparent',
    borderRightColor: '#FF4D4D',
  },
  shipFinRight: {
    width: 0,
    height: 0,
    borderTopWidth: 20,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderLeftColor: '#FF4D4D',
  },
  shipThruster: {
    width: 14,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#FFB800',
    marginTop: 2,
  },

  // ----- Asteroid -----
  asteroid: {
    position: 'absolute',
    width: ASTEROID_SIZE,
    height: ASTEROID_SIZE,
  },
  asteroidGradient: {
    flex: 1,
    borderRadius: ASTEROID_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4A3626',
  },
  craterOne: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#4A3626',
    top: 6,
    left: 8,
  },
  craterTwo: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#4A3626',
    bottom: 8,
    right: 6,
  },
  craterThree: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4A3626',
    top: 22,
    right: 14,
  },

  // ----- Controls -----
  controls: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 24,
  },
  controlButton: {
    backgroundColor: 'rgba(27, 31, 59, 0.85)',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#00E0FF',
  },
  controlButtonText: {
    color: '#00E0FF',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // ----- Game Over -----
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 14, 35, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameOverText: {
    color: '#FF4D4D',
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 2,
  },
  finalScoreText: {
    color: '#FFFFFF',
    fontSize: 20,
    marginBottom: 4,
  },
  finalHighScoreText: {
    color: '#FFD93D',
    fontSize: 16,
    marginBottom: 28,
  },
});