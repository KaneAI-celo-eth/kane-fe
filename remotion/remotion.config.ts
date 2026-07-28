/**
 * Remotion CLI config. When using the Node.JS APIs, this file doesn't apply —
 * pass options directly instead.
 * All options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
