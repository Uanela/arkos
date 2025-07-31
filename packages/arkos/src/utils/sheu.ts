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
    text: string = "",
    options: {
      timestamp?: boolean | string;
      bold?: boolean;
      label?: string;
    } = {}
  ): string {
    const label = options?.label
      ? text
        ? options?.label + " "
        : options?.label
      : "";
    let result = `${label}${text}`;

    // Apply timestamp if requested
    if (options.timestamp) {
      const timestamp = this.getTimestamp();
      if (options.timestamp === true)
        result = `${label}\x1b[90m${timestamp}\x1b[0m ${text}`;
      else if (typeof options.timestamp === "string") {
        const colorCode = this.getColorCode(options.timestamp);
        result = `${label}${colorCode}${timestamp}\x1b[0m ${text}`;
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
    text: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[31m${text}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Blue color
   */
  blue(
    text: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[34m${text}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Green color
   */
  green(
    text: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[32m${text}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Yellow color
   */
  yellow(
    text: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[33m${text}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Cyan color
   */
  cyan(
    text: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[36m${text}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Magenta color
   */
  magenta(
    text: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[35m${text}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * White color
   */
  white(
    text: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[37m${text}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Black color
   */
  black(
    text: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[30m${text}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Gray color
   */
  gray(
    text: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[90m${text}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Orange color
   */
  orange(
    text: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const coloredText = `\x1b[91m${text}\x1b[0m`;
    return this.formatText(coloredText, options || {});
  }

  /**
   * Bold text formatting
   */
  bold(text: string, options?: { timestamp?: boolean | string }): string {
    const boldText = `\x1b[1m${text}\x1b[0m`;
    return this.formatText(boldText, { ...options, bold: false }); // Don't double-bold
  }

  /**
   * Info label with cyan color [INFO]
   */
  info(
    message: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const label = `[\x1b[36mINFO\x1b[0m]`;
    const result = this.formatText(message, { ...options, label });
    console.info(result);
    return result;
  }

  /**
   * Error label with red color [ERROR]
   */
  error(
    message: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const label = `[\x1b[31mERROR\x1b[0m]`;
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
    const label = `[\x1b[32mREADY\x1b[0m]`;
    const result = this.formatText(message, { ...options, label });
    console.info(result);
    return result;
  }

  /**
   * Done label with green color [DONE]
   */
  done(
    message: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const label = `[\x1b[32mDONE\x1b[0m]`;
    const result = this.formatText(message, { ...options, label });
    console.info(result);
    return result;
  }

  /**
   * Warning label with yellow color [WARN]
   */
  warn(
    message: string,
    options?: { timestamp?: boolean | string; bold?: boolean }
  ): string {
    const label = `[\x1b[33mWARN\x1b[0m]`;
    const result = this.formatText(message, { ...options, label });
    console.warn(result);
    return result;
  }
}

const sheu = new Sheu();

export default sheu;
