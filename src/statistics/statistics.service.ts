import { Injectable } from '@nestjs/common';

export interface InterviewSession {
  id?: string;
  date?: string;
  position?: string;
  score?: number;
  evaluation?: {
    totalScore: number;
    techSkills: number;
    communication: number;
    confidence: number;
    structure: number;
    feedback: string;
  };
  [key: string]: unknown;
}

@Injectable()
export class StatisticsService {
  getAdvancedStats(sessions: InterviewSession[]) {
    const validSessions = sessions.filter(
      (session) => session.score !== undefined && session.evaluation,
    );
    const n = validSessions.length;

    if (n === 0) {
      return [
        {
          id: 1,
          title: 'Вероятность успешного прохождения',
          value: '0%',
          formula: 'P(Y = 1 | X) = 1 / (1 + e^(-(β₀ + β₁x₁ + ... + βₙxₙ)))',
          description:
            'Смысл: вероятность того, что кандидат пройдет реальное интервью на основе текущих навыков.',
          recommendation:
            'Пройдите хотя бы одно интервью для получения рекомендаций.',
          chartType: 'gauge',
        },
        {
          id: 2,
          title: 'Стандартизированный балл (Z-score)',
          value: 'Нет данных',
          formula: 'Z = (x − μ) / σ',
          description:
            'Смысл: насколько ваша последняя оценка отличается от вашего же среднего уровня.',
          recommendation: 'Пройдите минимум 2 интервью.',
          chartType: 'bellCurve',
        },
        {
          id: 3,
          title: 'Дисперсия результатов',
          value: 'Нет данных',
          formula: 'σ² = (1 / n) * Σ (xᵢ − μ)²',
          description: 'Смысл: оценивает стабильность ваших ответов.',
          recommendation: 'Нужно минимум 2 интервью.',
          chartType: 'boxPlot',
        },
        {
          id: 4,
          title: 'Скользящее среднее',
          value: '0 баллов',
          formula: 'Sₜ = (1 / k) * Σ (xᵢ)',
          description: 'Смысл: сглаженный прогресс пользователя.',
          recommendation: 'Пройдите интервью.',
          chartType: 'line',
        },
        {
          id: 5,
          title: 'Темп изменения уровня',
          value: '0%',
          formula: 'ΔS = Sₜ − Sₜ₋₁',
          description:
            'Смысл: растёт ли уровень пользователя от сессии к сессии.',
          recommendation: 'Нужно минимум 2 интервью.',
          chartType: 'sparkline',
        },
        {
          id: 6,
          title: 'Функция ошибки',
          value: 'Ошибка: 0',
          formula: 'L = (Sₜ − S*)²',
          description:
            'Смысл: насколько пользователь отклоняется от идеального уровня (100 баллов).',
          recommendation: 'Пройдите интервью.',
          chartType: 'lossLine',
        },
        {
          id: 7,
          title: 'Адаптивная сложность',
          value: 'Шкала: N/A',
          formula: 'Dₜ₊₁ = Dₜ + α (Sₜ − S*)',
          description:
            'Смысл: управление сложностью вопросов под ваш текущий уровень.',
          recommendation: 'Пройдите интервью.',
          chartType: 'progressBar',
        },
        {
          id: 8,
          title: 'Корреляция признаков',
          value: 'Нет данных',
          formula: 'r = Σ((xᵢ − x̄)(yᵢ − ȳ)) / (σₓ σᵧ)',
          description:
            'Смысл: какой именно навык (уверенность, речь и т.д.) сильнее всего влияет на вашу оценку.',
          recommendation: 'Нужно минимум 2 интервью.',
          chartType: 'scatter',
        },
        {
          id: 10,
          title: 'Байесовское обновление',
          value: 'Score: 0',
          formula: 'P(θ | D) = (P(D | θ) * P(θ)) / P(D)',
          description:
            'Смысл: истинная оценка, которая плавно обновляется с учетом каждого интервью.',
          recommendation: 'Пройдите интервью.',
          chartType: 'bayesLine',
        },
      ];
    }

    const scores = validSessions.map((session) => session.score || 0);
    const chronoScores = [...scores].reverse();
    const nChrono = chronoScores.length;

    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const lastScore = scores[0];

    const avgTech =
      validSessions.reduce(
        (a, session) => a + (session.evaluation?.techSkills || 0),
        0,
      ) / n;
    const avgComm =
      validSessions.reduce(
        (a, session) => a + (session.evaluation?.communication || 0),
        0,
      ) / n;
    const avgStruct =
      validSessions.reduce(
        (a, session) => a + (session.evaluation?.structure || 0),
        0,
      ) / n;
    const avgConf =
      validSessions.reduce(
        (a, session) => a + (session.evaluation?.confidence || 0),
        0,
      ) / n;

    const zLogReg =
      -12 + 0.06 * avgTech + 0.04 * avgComm + 0.05 * avgStruct + 0.03 * avgConf;
    const prob = 1 / (1 + Math.exp(-zLogReg));
    const probPercent = Math.round(prob * 100);

    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stddev = Math.sqrt(variance);

    let zScoreStr = 'Нужно >1 интервью';
    let myZ = 0;
    if (n > 1 && stddev > 0) {
      myZ = (lastScore - mean) / stddev;
      zScoreStr = `${myZ > 0 ? '+' : ''}${myZ.toFixed(2)}σ (от среднего)`;
    }

    let stability = 'Высокая';
    if (variance > 100) stability = 'Низкая';
    else if (variance > 40) stability = 'Средняя';

    let min = 0;
    let q1 = 0;
    let median = 0;
    let q3 = 0;
    let max = 0;
    if (n > 0) {
      const sorted = [...scores].sort((a, b) => a - b);
      min = sorted[0];
      max = sorted[n - 1];
      median = sorted[Math.floor(n / 2)];
      q1 = sorted[Math.floor(n / 4)];
      q3 = sorted[Math.floor((n * 3) / 4)];
    }

    const k = Math.min(3, nChrono);
    const lastK = chronoScores.slice(-k);
    const movingAvg = lastK.reduce((a, b) => a + b, 0) / k;
    const maArray = chronoScores.map((_, i, arr) => {
      const start = Math.max(0, i - 2);
      const slice = arr.slice(start, i + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });

    let deltaS = 0;
    if (n > 1) {
      deltaS = scores[0] - scores[1];
    }

    const target = 100;
    const loss = Math.pow(lastScore - target, 2) / 100;
    const lossArray = chronoScores.map(
      (score) => Math.pow(score - target, 2) / 100,
    );

    let difficulty = 'Medium (50-80)';
    if (lastScore >= 80) difficulty = 'Hard (>80)';
    else if (lastScore <= 50) difficulty = 'Easy (<50)';

    let correlationStr = 'Нужно >1 интервью';
    let scatterPoints: { x: number; y: number }[] = [];
    let bestSkillName = '';

    if (n > 1 && stddev > 0) {
      const corr = (arrX: number[], arrY: number[]) => {
        const mX = arrX.reduce((a, b) => a + b, 0) / n;
        const mY = arrY.reduce((a, b) => a + b, 0) / n;
        let num = 0;
        let denX = 0;
        let denY = 0;

        for (let i = 0; i < n; i++) {
          num += (arrX[i] - mX) * (arrY[i] - mY);
          denX += Math.pow(arrX[i] - mX, 2);
          denY += Math.pow(arrY[i] - mY, 2);
        }

        if (denX === 0 || denY === 0) return 0;
        return num / Math.sqrt(denX * denY);
      };

      const arrTech = validSessions.map(
        (session) => session.evaluation!.techSkills,
      );
      const arrComm = validSessions.map(
        (session) => session.evaluation!.communication,
      );
      const arrStruct = validSessions.map(
        (session) => session.evaluation!.structure,
      );
      const arrConf = validSessions.map(
        (session) => session.evaluation!.confidence,
      );

      const rTech = corr(arrTech, scores);
      const rComm = corr(arrComm, scores);
      const rStruct = corr(arrStruct, scores);
      const rConf = corr(arrConf, scores);

      const maxCorr = Math.max(rTech, rComm, rStruct, rConf);
      let bestArr = arrTech;

      if (maxCorr === rTech) {
        correlationStr = `Тех. навыки (r=${maxCorr.toFixed(2)})`;
        bestSkillName = 'Тех. навыки';
      } else if (maxCorr === rComm) {
        correlationStr = `Речь (r=${maxCorr.toFixed(2)})`;
        bestArr = arrComm;
        bestSkillName = 'Речь';
      } else if (maxCorr === rStruct) {
        correlationStr = `Структура (r=${maxCorr.toFixed(2)})`;
        bestArr = arrStruct;
        bestSkillName = 'Структура';
      } else {
        correlationStr = `Уверенность (r=${maxCorr.toFixed(2)})`;
        bestArr = arrConf;
        bestSkillName = 'Уверенность';
      }

      scatterPoints = bestArr.map((v, i) => ({ x: v, y: scores[i] }));
    }

    const bayesScore = (mean * n + 50 * 1) / (n + 1);
    const bayesArray = chronoScores.map((_, i, arr) => {
      const currentN = i + 1;
      const currentMean =
        arr.slice(0, currentN).reduce((a, b) => a + b, 0) / currentN;
      return (currentMean * currentN + 50 * 1) / (currentN + 1);
    });

    let recProb = 'Пройдите интервью для получения рекомендаций.';
    if (probPercent >= 80) {
      recProb =
        'Ваши шансы крайне высоки. Поддерживайте текущий уровень, вы готовы к реальным собеседованиям.';
    } else if (probPercent >= 50) {
      recProb =
        'Шансы средние. Вам нужно подтянуть тот навык, который сейчас отстает сильнее всего (например, Технические навыки).';
    } else {
      recProb =
        'Пока вероятность низкая. Сфокусируйтесь на базовой структуре ответов (метод STAR) и повышении уверенности речи.';
    }

    let recZ = 'Нужно минимум 2 интервью для расчета.';
    if (n > 1) {
      if (myZ > 1) {
        recZ =
          'Ваша последняя сессия значительно лучше вашего обычного уровня. Постарайтесь понять, что пошло хорошо, и закрепите этот шаблон.';
      } else if (myZ > 0) {
        recZ =
          'Вы идете с небольшим опережением своего среднего темпа. Продолжайте в том же духе.';
      } else if (myZ < -1) {
        recZ =
          'В этот раз результат заметно ниже вашего стандарта. Возможно, стоит повторить теорию по пройденным темам.';
      } else {
        recZ =
          'Ваш уровень сейчас крайне стабилен (около вашего же среднего). Чтобы совершить рывок, попробуйте отвечать более детально.';
      }
    }

    let recVar = 'Пройдите минимум 2 интервью.';
    if (n > 1) {
      if (variance <= 40) {
        recVar =
          "Ваши оценки очень кучные. Это отличный знак предсказуемости. Теперь ваша задача — плавно сдвинуть всю 'кучу' вверх.";
      } else if (variance <= 100) {
        recVar =
          'Есть небольшие перепады в зависимости от вопросов. Старайтесь готовить универсальные заготовки (шаблоны ответов).';
      } else {
        recVar =
          'У вас сильный разброс баллов (то густо, то пусто). Вам не хватает системности: жестко придерживайтесь структуры STAR для любых вопросов.';
      }
    }

    let recMA = 'Пройдите интервью.';
    if (n > 1) {
      if (movingAvg > mean + 2) {
        recMA =
          'Ваши последние интервью идут лучше, чем история в целом. Вы находитесь в восходящем тренде!';
      } else if (movingAvg < mean - 2) {
        recMA =
          'В последнее время средний балл немного просел по сравнению с вашей историей. Пора взять перерыв или сменить тактику.';
      } else {
        recMA =
          'Вы вышли на плато: средний балл перестал меняться. Попробуйте попросить ИИ усложнить вопросы.';
      }
    }

    let recDelta = 'Нужно минимум 2 интервью.';
    if (n > 1) {
      if (deltaS > 10) {
        recDelta =
          'Огромный скачок вперед по сравнению с прошлой сессией! Отличная работа над ошибками.';
      } else if (deltaS > 0) {
        recDelta =
          'Медленный, но верный рост. Закрепляйте пройденный материал.';
      } else if (deltaS < -10) {
        recDelta =
          'Резкое падение баллов. Перечитайте фидбек ИИ за последнюю сессию, там кроется главная проблема.';
      } else if (deltaS < 0) {
        recDelta =
          'Небольшой спад. Не переживайте, это абсолютно нормальный процесс обучения.';
      } else {
        recDelta =
          'Балл не изменился. Стагнация — признак того, что вы привыкли к текущей сложности.';
      }
    }

    let recLoss = 'Пройдите интервью.';
    if (n > 0) {
      if (loss < 2) {
        recLoss =
          'Ошибка минимальна. Вы практически достигли идеального уровня ответов.';
      } else if (loss < 15) {
        recLoss =
          'Ваша ошибка постепенно сокращается. Главная зона роста сейчас — это уверенность речи и глубина деталей.';
      } else {
        recLoss =
          "Высокая 'ошибка' (отклонение от 100) говорит о базовых проблемах в коммуникации. Начните с четкой структуры.";
      }
    }

    let recDiff = 'Пройдите интервью.';
    if (n > 0) {
      if (difficulty.includes('Hard')) {
        recDiff =
          'Вы на максимальном уровне сложности. ИИ задает вопросы с подвохом. Будьте предельно внимательны к деталям.';
      } else if (difficulty.includes('Easy')) {
        recDiff =
          'Сложность была снижена алгоритмом для комфортного обучения. Сосредоточьтесь на правильной формулировке мыслей.';
      } else {
        recDiff =
          'Текущая сложность оптимальна. Вы получаете сбалансированные вопросы по вашей позиции.';
      }
    }

    let recCorr = 'Нужно минимум 2 интервью.';
    if (n > 1 && bestSkillName) {
      recCorr = `Алгоритм выявил, что именно «${bestSkillName}» математически сильнее всего тянет ваш итоговый балл вверх или вниз. Сделайте этот навык абсолютным приоритетом!`;
    }

    let recBayes = 'Пройдите интервью.';
    if (n > 0) {
      if (bayesScore > mean + 1) {
        recBayes =
          'Алгоритм прогнозирует, что ваш реальный потенциал даже выше вашего текущего среднего балла.';
      } else if (bayesScore < mean - 1) {
        recBayes =
          "Алгоритм консервативно оценивает ваши знания. Нужно больше стабильных высоких оценок, чтобы 'убедить' его.";
      } else {
        recBayes =
          'Оценка алгоритма почти полностью совпадает с вашим средним баллом. Модель отлично откалибровалась под вас.';
      }
    }

    return [
      {
        id: 1,
        title: 'Вероятность успешного прохождения',
        value: `${probPercent}%`,
        formula: 'P(Y = 1 | X) = 1 / (1 + e^(-(β₀ + β₁x₁ + ... + βₙxₙ)))',
        description:
          'Смысл: вероятность того, что кандидат пройдет реальное интервью на основе текущих навыков.',
        recommendation: recProb,
        chartType: 'gauge',
        chartData: { probPercent },
      },
      {
        id: 2,
        title: 'Стандартизированный балл (Z-score)',
        value: zScoreStr,
        formula: 'Z = (x − μ) / σ',
        description:
          'Смысл: насколько ваша последняя сессия отличается от вашего среднего балла.',
        recommendation: recZ,
        chartType: 'bellCurve',
        chartData: { myZ },
      },
      {
        id: 3,
        title: 'Дисперсия результатов',
        value: `Стабильность: ${stability}`,
        formula: 'σ² = (1 / n) * Σ (xᵢ − μ)²',
        description:
          'Смысл: оценивает стабильность ваших ответов. Чем ниже дисперсия, тем предсказуемее результат.',
        recommendation: recVar,
        chartType: 'boxPlot',
        chartData: { min, q1, median, q3, max },
      },
      {
        id: 4,
        title: 'Скользящее среднее',
        value: `${Math.round(movingAvg)} баллов`,
        formula: 'Sₜ = (1 / k) * Σ (xᵢ)',
        description:
          'Смысл: сглаженный прогресс пользователя, убирающий случайные скачки.',
        recommendation: recMA,
        chartType: 'line',
        chartData: { array: maArray },
      },
      {
        id: 5,
        title: 'Темп изменения уровня',
        value: `${deltaS > 0 ? '+' : ''}${deltaS}%`,
        formula: 'ΔS = Sₜ − Sₜ₋₁',
        description:
          'Смысл: разница в баллах между вашим последним и предпоследним интервью.',
        recommendation: recDelta,
        chartType: 'sparkline',
        chartData: { array: chronoScores.slice(-5) },
      },
      {
        id: 6,
        title: 'Функция ошибки',
        value: `Ошибка: ${loss.toFixed(2)}`,
        formula: 'L = (Sₜ − S*)²',
        description:
          'Смысл: квадратичное отклонение вашего балла от идеального результата (100 баллов).',
        recommendation: recLoss,
        chartType: 'lossLine',
        chartData: { array: lossArray },
      },
      {
        id: 7,
        title: 'Адаптивная сложность',
        value: `Шкала: ${difficulty.split(' ')[0]}`,
        formula: 'Dₜ₊₁ = Dₜ + α (Sₜ − S*)',
        description:
          'Смысл: текущий уровень сложности вопросов, который подстраивается под ваши результаты.',
        recommendation: recDiff,
        chartType: 'progressBar',
        chartData: { score: lastScore || 0 },
      },
      {
        id: 8,
        title: 'Корреляция признаков',
        value: correlationStr,
        formula: 'r = Σ((xᵢ − x̄)(yᵢ − ȳ)) / (σₓ σᵧ)',
        description:
          'Смысл: какой именно навык (уверенность, речь, структура или тех. часть) сильнее всего коррелирует с вашей итоговой оценкой.',
        recommendation: recCorr,
        chartType: 'scatter',
        chartData: { points: scatterPoints },
      },
      {
        id: 10,
        title: 'Байесовское обновление',
        value: `Score: ${bayesScore.toFixed(1)}`,
        formula: 'P(θ | D) = (P(D | θ) * P(θ)) / P(D)',
        description:
          'Смысл: истинная оценка, которая плавно обновляется после каждого ответа с учетом истории.',
        recommendation: recBayes,
        chartType: 'bayesLine',
        chartData: { array: bayesArray },
      },
    ];
  }
}
