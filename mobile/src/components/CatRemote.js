import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  DeviceEventEmitter,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, shadow } from "../theme";

const sleepFrames = [
  require("../../assets/cat-animation/cat-frames/cat_01_sleep.png"),
  require("../../assets/cat-animation/cat-frames/cat_02_sleep.png"),
  require("../../assets/cat-animation/cat-frames/cat_03_sleep.png"),
  require("../../assets/cat-animation/cat-frames/cat_04_sleep.png"),
  require("../../assets/cat-animation/cat-frames/cat_05_sleep.png"),
  require("../../assets/cat-animation/cat-frames/cat_06_sleep.png"),
  require("../../assets/cat-animation/cat-frames/cat_07_sleep.png"),
  require("../../assets/cat-animation/cat-frames/cat_08_sleep.png"),
  require("../../assets/cat-animation/cat-frames/cat_09_sleep.png"),
  require("../../assets/cat-animation/cat-frames/cat_10_sleep.png"),
  require("../../assets/cat-animation/cat-frames/cat_11_sleep.png"),
];

const feedFrames = [
  require("../../assets/cat-animation/cat-feed/cat_01_feed.png"),
  require("../../assets/cat-animation/cat-feed/cat_02_feed.png"),
  require("../../assets/cat-animation/cat-feed/cat_03_feed.png"),
  require("../../assets/cat-animation/cat-feed/cat_04_feed.png"),
  require("../../assets/cat-animation/cat-feed/cat_05_feed.png"),
  require("../../assets/cat-animation/cat-feed/cat_06_feed.png"),
  require("../../assets/cat-animation/cat-feed/cat_07_feed.png"),
  require("../../assets/cat-animation/cat-feed/cat_08_feed.png"),
  require("../../assets/cat-animation/cat-feed/cat_09_feed.png"),
  require("../../assets/cat-animation/cat-feed/cat_10_feed.png"),
  require("../../assets/cat-animation/cat-feed/cat_11_feed.png"),
  require("../../assets/cat-animation/cat-feed/cat_12_feed.png"),
];

const groomingFrames = [
  require("../../assets/cat-animation/cat-grooming/1.png"),
  require("../../assets/cat-animation/cat-grooming/2.png"),
  require("../../assets/cat-animation/cat-grooming/3.png"),
  require("../../assets/cat-animation/cat-grooming/4.png"),
  require("../../assets/cat-animation/cat-grooming/5.png"),
  require("../../assets/cat-animation/cat-grooming/6.png"),
  require("../../assets/cat-animation/cat-grooming/7.png"),
  require("../../assets/cat-animation/cat-grooming/8.png"),
  require("../../assets/cat-animation/cat-grooming/9.png"),
  require("../../assets/cat-animation/cat-grooming/10.png"),
  require("../../assets/cat-animation/cat-grooming/11.png"),
  require("../../assets/cat-animation/cat-grooming/12.png"),
];

const tailFrames = [
  require("../../assets/cat-animation/cat-tail/cat_01_tail.png"),
  require("../../assets/cat-animation/cat-tail/cat_02_tail.png"),
  require("../../assets/cat-animation/cat-tail/cat_03_tail.png"),
  require("../../assets/cat-animation/cat-tail/cat_04_tail.png"),
  require("../../assets/cat-animation/cat-tail/cat_05_tail.png"),
  require("../../assets/cat-animation/cat-tail/cat_06_tail.png"),
  require("../../assets/cat-animation/cat-tail/cat_07_tail.png"),
  require("../../assets/cat-animation/cat-tail/cat_08_tail.png"),
  require("../../assets/cat-animation/cat-tail/cat_09_tail.png"),
  require("../../assets/cat-animation/cat-tail/cat_10_tail.png"),
  require("../../assets/cat-animation/cat-tail/cat_11_tail.png"),
  require("../../assets/cat-animation/cat-tail/cat_12_tail.png"),
];

const hideFrames = [
  require("../../assets/cat-animation/cat-hide/1.png"),
  require("../../assets/cat-animation/cat-hide/2.png"),
  require("../../assets/cat-animation/cat-hide/3.png"),
  require("../../assets/cat-animation/cat-hide/4.png"),
  require("../../assets/cat-animation/cat-hide/5.png"),
  require("../../assets/cat-animation/cat-hide/6.png"),
  require("../../assets/cat-animation/cat-hide/7.png"),
  require("../../assets/cat-animation/cat-hide/8.png"),
  require("../../assets/cat-animation/cat-hide/9.png"),
  require("../../assets/cat-animation/cat-hide/11.png"),
  require("../../assets/cat-animation/cat-hide/12.png"),
  require("../../assets/cat-animation/cat-hide/13.png"),
  require("../../assets/cat-animation/cat-hide/14.png"),
  require("../../assets/cat-animation/cat-hide/15.png"),
  require("../../assets/cat-animation/cat-hide/16.png"),
  require("../../assets/cat-animation/cat-hide/17.png"),
  require("../../assets/cat-animation/cat-hide/18.png"),
  require("../../assets/cat-animation/cat-hide/19.png"),
  require("../../assets/cat-animation/cat-hide/21.png"),
  require("../../assets/cat-animation/cat-hide/22.png"),
  require("../../assets/cat-animation/cat-hide/23.png"),
  require("../../assets/cat-animation/cat-hide/24.png"),
];

const homeFrames = [
  require("../../assets/cat-animation/cat-home/1.png"),
  require("../../assets/cat-animation/cat-home/2.png"),
  require("../../assets/cat-animation/cat-home/3.png"),
  require("../../assets/cat-animation/cat-home/4.png"),
  require("../../assets/cat-animation/cat-home/5.png"),
  require("../../assets/cat-animation/cat-home/6.png"),
  require("../../assets/cat-animation/cat-home/7.png"),
];

const ACTIONS = {
  sleep: { frames: sleepFrames, duration: 90 },
  feed: { frames: feedFrames, duration: 108 },
  grooming: { frames: groomingFrames, duration: 167 },
  tail: { frames: tailFrames, duration: 233 },
  hide: { frames: hideFrames, duration: 127 },
};

export function CatRemote() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [easterEgg, setEasterEgg] = useState(false);
  const [action, setAction] = useState("sleep");
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const menu = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const hiddenPeek = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const timer = useRef(null);
  const tailAnimation = useRef(null);
  const tapTimer = useRef(null);
  const tailTimer = useRef(null);
  const homeFrame = useMemo(
    () => homeFrames[Math.floor(Math.random() * homeFrames.length)],
    [hidden],
  );

  const frames = ACTIONS[action].frames;

  const animateHiddenPeek = (visible) => {
    Animated.spring(hiddenPeek, {
      toValue: visible ? 1 : 0,
      speed: 18,
      bounciness: visible ? 7 : 2,
      useNativeDriver: true,
    }).start();
  };

  const restoreCat = () => {
    animateHiddenPeek(true);
    setTimeout(() => {
      setHidden(false);
      hiddenPeek.setValue(0);
    }, 180);
  };

  useEffect(() => {
    Animated.timing(menu, {
      toValue: open ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [menu, open]);

  useEffect(() => {
    if (tailTimer.current) {
      clearTimeout(tailTimer.current);
      tailTimer.current = null;
    }
    if (!open || playing) return undefined;

    tailTimer.current = setTimeout(() => {
      setAction("tail");
      setFrameIndex(0);
      let index = 0;
      tailAnimation.current = setInterval(() => {
        index = (index + 1) % tailFrames.length;
        setFrameIndex(index);
      }, ACTIONS.tail.duration);
    }, 3000);

    return () => {
      if (tailTimer.current) clearTimeout(tailTimer.current);
      tailTimer.current = null;
      if (tailAnimation.current) {
        clearInterval(tailAnimation.current);
        tailAnimation.current = null;
        setAction("sleep");
        setFrameIndex(1);
      }
    };
  }, [open, playing]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1300,
          useNativeDriver: true,
        }),
      ]),
    );
    if (!playing && !hidden) loop.start();
    return () => loop.stop();
  }, [breathe, hidden, playing]);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      if (tailAnimation.current) clearInterval(tailAnimation.current);
      if (tapTimer.current) clearTimeout(tapTimer.current);
      if (tailTimer.current) clearTimeout(tailTimer.current);
    },
    [],
  );

  const play = (name, onDone) => {
    if (playing) return;
    if (timer.current) clearInterval(timer.current);
    if (tailAnimation.current) {
      clearInterval(tailAnimation.current);
      tailAnimation.current = null;
    }
    if (tailTimer.current) clearTimeout(tailTimer.current);
    setPlaying(true);
    setOpen(false);
    setAction(name);
    setFrameIndex(0);
    let index = 0;
    timer.current = setInterval(() => {
      index += 1;
      if (index >= ACTIONS[name].frames.length) {
        clearInterval(timer.current);
        timer.current = null;
        setAction("sleep");
        setFrameIndex(0);
        setPlaying(false);
        onDone?.();
        return;
      }
      setFrameIndex(index);
    }, ACTIONS[name].duration);
  };

  const tapCat = () => {
    if (playing) return;
    const now = Date.now();
    if (now - lastTap.current < 320) {
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
      setEasterEgg(true);
      setOpen(true);
      setAction("sleep");
      setFrameIndex(1);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(() => {
      setOpen((value) => {
        const next = !value;
        if (!next) setEasterEgg(false);
        return next;
      });
      setAction("sleep");
      setFrameIndex(1);
      tapTimer.current = null;
    }, 180);
  };

  const move = (direction) => {
    if (playing) return;
    setPlaying(true);
    setOpen(false);
    setEasterEgg(false);
    setAction("sleep");
    setFrameIndex(1);
    DeviceEventEmitter.emit(
      direction === "top" ? "aimyaong:scroll-top" : "aimyaong:scroll-bottom",
    );
    jump.setValue(0);
    Animated.sequence([
      Animated.timing(jump, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(jump, {
        toValue: 0,
        duration: 580,
        useNativeDriver: true,
      }),
    ]).start();
    let index = 1;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      index += 1;
      if (index >= sleepFrames.length) {
        clearInterval(timer.current);
        timer.current = null;
        setFrameIndex(0);
        setPlaying(false);
        return;
      }
      setFrameIndex(index);
    }, 100);
  };

  if (hidden) {
    return (
      <Pressable
        style={styles.homeButton}
        onPressIn={() => animateHiddenPeek(true)}
        onPressOut={() => animateHiddenPeek(false)}
        onPress={restoreCat}
        accessibilityLabel="숨은 고양이 다시 보이기"
      >
        <Animated.Image
          source={homeFrame}
          style={[
            styles.homeImage,
            {
              transform: [
                {
                  translateY: hiddenPeek.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -24],
                  }),
                },
              ],
            },
          ]}
          resizeMode="contain"
        />
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[
          styles.menu,
          {
            opacity: menu,
            transform: [
              {
                translateY: menu.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
              {
                scale: menu.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.94, 1],
                }),
              },
            ],
          },
        ]}
      >
        <CatButton label="Top" onPress={() => move("top")} />
        <CatButton label="Bottom" onPress={() => move("bottom")} />
        {easterEgg ?
          <>
            <CatButton label="Feed Cat" onPress={() => play("feed")} />
            <CatButton label="Grooming" onPress={() => play("grooming")} />
          </>
        : null}
        <CatButton
          label="Hide"
          onPress={() => play("hide", () => setHidden(true))}
          style={styles.hideAction}
        />
      </Animated.View>

      <Pressable
        accessibilityLabel="고양이 바로가기 메뉴"
        onPress={tapCat}
        disabled={playing}
        style={({ pressed }) => [styles.catButton, pressed && styles.pressed]}
      >
        <Animated.Image
          source={frames[Math.min(frameIndex, frames.length - 1)]}
          resizeMode="contain"
          style={[
            styles.catImage,
            action === "feed" && styles.feedImage,
            action === "grooming" && styles.groomingImage,
            action === "tail" && styles.tailImage,
            action === "hide" && styles.hideImage,
            playing &&
              action === "sleep" && {
                transform: [
                  {
                    translateY: jump.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -32],
                    }),
                  },
                  {
                    rotate: jump.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: ["0deg", "-4deg", "3deg"],
                    }),
                  },
                  {
                    scale: jump.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.06],
                    }),
                  },
                ],
              },
            !playing && {
              transform: [
                {
                  translateY: breathe.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -3],
                  }),
                },
                {
                  scale: breathe.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.015],
                  }),
                },
              ],
            },
          ]}
        />
      </Pressable>
    </View>
  );
}

function CatButton({ label, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 3, bottom: 3, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.action,
        style,
        pressed && styles.actionPressed,
      ]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 7,
    bottom: 54,
    zIndex: 100,
    alignItems: "center",
  },
  menu: { gap: 8, alignItems: "center", marginBottom: 14 },
  action: {
    minWidth: 92,
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 11,
    ...shadow,
  },
  actionPressed: {
    backgroundColor: colors.cream,
    borderColor: colors.primary,
    transform: [{ scale: 0.96 }],
  },
  actionText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  hideAction: { marginTop: 5 },
  catButton: {
    width: 112,
    height: 64,
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  catImage: { width: 112, height: 82 },
  feedImage: { width: 118, height: 112, marginBottom: -8 },
  groomingImage: { width: 118, height: 98, marginBottom: -6 },
  tailImage: { width: 118, height: 96, marginRight: -2, marginBottom: -3 },
  hideImage: { width: 164, height: 118, marginRight: -18, marginBottom: -8 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  homeButton: {
    position: "absolute",
    zIndex: 100,
    right: 8,
    bottom: 82,
    width: 112,
    height: 74,
    overflow: "hidden",
  },
  homeImage: {
    position: "absolute",
    right: 0,
    bottom: -38,
    width: 112,
    height: 112,
  },
});
