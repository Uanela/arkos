/**
 * Sheu - Simplified terminal color utility for styling console output
 */
class Sheu {
  /**
   * Get current timestamp in HH:MM:SS format
   */
  private getTimestamp(): string {
    return new Date().toTimeString().split(" ")[0];
  }

  /**
   * Apply timestamp and bold formatting if requested
   */
  private formatText(
    content: any = "",
    options: {
      timestamp?: boolean | string;
      bold?: boolean;
      label?: string;
    } = {}
  ): string {
    const label = options?.label
      ? content
        ? options?.label + " "
        : content === null
          ? options?.label + " "
          : options?.label
      : "";
    let result = `${label}${content}`;

    // Apply timestamp if requested
    if (options.timestamp) {
      const timestamp = this.getTimestamp();
      if (options.timestamp === true)
        result = `${label}\x1b[90m${timestamp}\x1b[0m ${content}`;
      else if (typeof options.timestamp === "string") {
        const colorCode = this.getColorCode(options.timestamp);
        result = `${label}${colorCode}${timestamp}\x1b[0m ${content}`;
      }
    }

    if (options.bold) result = `\x1b[1m${result}\x1b[0m`;

    return result;
  }

  /**
   * Get ANSI color code for color name
   */
  private getColorCode(color: string): string {
    const colorMap: { [key: string]: string } = {
      red: "\x1b[31m",
      blue: "\x1b[34m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      cyan: "\x1b[36m",
      magenta: "\x1b[35m",
      white: "\x1b[37m",
      black: "\x1b[30m",
      gray: "\x1b[90m",
      orange: "\x1b[91m",
    };
    return colorMap[color] || "\x1b[90m"; // Default to gray if color not found
  }

  /**
   * Red color
   */
  red(
    content: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[31m${content}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Blue color
   */
  blue(
    content: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[34m${content}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Green color
   */
  green(
    content: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[32m${content}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Yellow color
   */
  yellow(
    content: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[33m${content}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Cyan color
   */
  cyan(
    content: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[36m${content}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Magenta color
   */
  magenta(
    content: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[35m${content}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * White color
   */
  white(
    content: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[37m${content}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Black color
   */
  black(
    content: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[30m${content}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Gray color
   */
  gray(
    content: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[90m${content}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Orange color
   */
  orange(
    content: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[91m${content}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Bold text formatting
   */
  bold(content: any, options?: { timestamp?: boolean | string }): string {
    return this.formatText(content, { ...options, bold: true });
  }

  /**
   * Info label with cyan color [INFO]
   */
  info(
    message: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const label = `[\x1b[36mInfo\x1b[0m]`;
    const result = this.formatText(message, { ...options, label });
    console.info(result);
    return result;
  }

  /**
   * Simple Log with no label
   */
  print(
    message: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const result = this.formatText(message, { ...options });
    console.info(result);
    return result;
  }

  /**
   * Error label with red color [ERROR]
   */
  error(
    message: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const label = `[\x1b[31mError\x1b[0m]`;
    const result = this.formatText(message, { ...options, label });
    console.error(result);
    return result;
  }

  /**
   * Ready label with green color [READY]
   */
  ready(
    message: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    // const label = `\x1b[32m✓\x1b[0m`;
    const label = `[\x1b[32mReady\x1b[0m]`;
    const result = this.formatText(message, { ...options, label });
    console.info(result);
    return result;
  }

  /**
   * Done label with green color [DONE]
   */
  done(
    message: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const label = `[\x1b[32mDone\x1b[0m]`;
    const result = this.formatText(message, { ...options, label });
    console.info(result);
    return result;
  }

  /**
   * Warning label with yellow color [WARN]
   */
  warn(
    message: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const label = `[\x1b[33mWarn\x1b[0m]`;
    const result = this.formatText(message, { ...options, label });
    console.warn(result);
    return result;
  }

  /**
   * Debug label with magenta color [DEBUG]
   */
  debug(
    message: any,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const label = `[\x1b[35mDebug\x1b[0m]`;
    const result = this.formatText(message, { ...options, label });
    console.debug(result);
    return result;
  }
}

const sheu = new Sheu();

export default sheu;
