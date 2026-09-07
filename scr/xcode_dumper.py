import os
import fnmatch
from pathlib import Path
from datetime import datetime
import re

class XcodeProjectParser:
    def __init__(self, project_path, output_file="project_dump.txt"):
        self.project_path = Path(project_path)
        self.output_file = output_file
        self.ignore_patterns = self._get_default_ignore_patterns()
        self.include_extensions = self._get_include_extensions()
        self.stats = {
            'total_files': 0,
            'total_lines': 0,
            'total_size': 0,
            'files_by_extension': {}
        }
    
    def _get_default_ignore_patterns(self):
        return [
            '*.git*',
            '*.xcworkspace*',
            '*.xcodeproj*',
            '*.xcuserstate',
            '*.DS_Store',
            'build/*',
            'DerivedData/*',
            '*.xcassets/*.imageset/*',
            '*.xcassets/*.appiconset/*',
            '*.lproj/*',
            '*.strings',
            '*.plist',
            '*.png', '*.jpg', '*.jpeg', '*.gif', '*.pdf',
            '*.mp3', '*.mp4', '*.m4a', '*.wav',
            '*.ttf', '*.otf',
            'Pods/*',
            'Carthage/*',
            'fastlane/*',
        ]
    
    def _get_include_extensions(self):
        return [
            '.swift', '.h', '.m', '.mm', '.cpp', '.c',
            '.storyboard', '.xib', '.json', '.entitlements',
            '.xcconfig', '.md', '.txt', '.strings',
        ]
    
    def should_ignore(self, file_path):
        """Проверяет, нужно ли игнорировать файл"""
        relative_path = os.path.relpath(file_path, self.project_path)
        
        # Проверяем паттерны игнорирования
        for pattern in self.ignore_patterns:
            if fnmatch.fnmatch(relative_path, pattern) or fnmatch.fnmatch(str(file_path), pattern):
                return True
        
        # Проверяем, что файл находится в папке проекта (не системные пути)
        if 'node_modules' in str(file_path):
            return True
            
        return False
    
    def collect_files(self):
        """Собирает все файлы проекта"""
        all_files = []
        
        for root, dirs, files in os.walk(self.project_path):
            # Пропускаем игнорируемые директории
            dirs[:] = [d for d in dirs if not self.should_ignore(os.path.join(root, d))]
            
            for file in files:
                file_path = os.path.join(root, file)
                
                if self.should_ignore(file_path):
                    continue
                
                file_ext = os.path.splitext(file)[1].lower()
                if file_ext in self.include_extensions:
                    all_files.append(file_path)
                    
                    # Обновляем статистику
                    self.stats['total_files'] += 1
                    self.stats['files_by_extension'][file_ext] = self.stats['files_by_extension'].get(file_ext, 0) + 1
                    
                    try:
                        self.stats['total_size'] += os.path.getsize(file_path)
                        with open(file_path, 'r', encoding='utf-8') as f:
                            self.stats['total_lines'] += len(f.readlines())
                    except:
                        pass
        
        return sorted(all_files)
    
    def generate_tree_structure(self, max_depth=5):
        """Генерирует древовидную структуру проекта"""
        tree = []
        
        def add_to_tree(path, depth=0, prefix=""):
            if depth > max_depth:
                return
            
            if os.path.isfile(path):
                file_ext = os.path.splitext(path)[1]
                if file_ext in self.include_extensions:
                    tree.append(f"{prefix}📄 {os.path.basename(path)}")
            else:
                items = sorted(os.listdir(path))
                items = [item for item in items if not self.should_ignore(os.path.join(path, item))]
                
                for i, item in enumerate(items):
                    is_last = i == len(items) - 1
                    current_prefix = "└── " if is_last else "├── "
                    next_prefix = prefix + ("    " if is_last else "│   ")
                    
                    item_path = os.path.join(path, item)
                    
                    if os.path.isdir(item_path):
                        tree.append(f"{prefix}{current_prefix}📁 {item}/")
                        add_to_tree(item_path, depth + 1, next_prefix)
                    else:
                        file_ext = os.path.splitext(item)[1]
                        if file_ext in self.include_extensions:
                            tree.append(f"{prefix}{current_prefix}📄 {item}")
        
        return "\n".join(tree)
    
    def create_dump(self):
        """Создает дамп проекта"""
        print("🔍 Сканирование проекта...")
        files = self.collect_files()
        
        print(f"📊 Найдено файлов: {len(files)}")
        
        with open(self.output_file, 'w', encoding='utf-8') as out_file:
            # Заголовок
            out_file.write("=" * 80 + "\n")
            out_file.write("XCODE PROJECT DUMP FOR GOOGLE GEMINI\n")
            out_file.write("=" * 80 + "\n\n")
            
            # Мета-информация
            out_file.write(f"📁 Проект: {self.project_path}\n")
            out_file.write(f"📅 Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            out_file.write(f"📊 Статистика:\n")
            out_file.write(f"  • Всего файлов: {self.stats['total_files']}\n")
            out_file.write(f"  • Всего строк: {self.stats['total_lines']:,}\n")
            out_file.write(f"  • Общий размер: {self.stats['total_size'] / 1024:.2f} KB\n")
            out_file.write(f"\n📂 Расширения файлов:\n")
            for ext, count in sorted(self.stats['files_by_extension'].items()):
                out_file.write(f"  • {ext}: {count} файлов\n")
            
            out_file.write(f"\n🌳 Структура проекта:\n")
            out_file.write("-" * 40 + "\n")
            out_file.write(self.generate_tree_structure())
            out_file.write("\n\n")
            
            # Содержимое файлов
            out_file.write("=" * 80 + "\n")
            out_file.write("СОДЕРЖИМОЕ ФАЙЛОВ\n")
            out_file.write("=" * 80 + "\n\n")
            
            for i, file_path in enumerate(files, 1):
                relative_path = os.path.relpath(file_path, self.project_path)
                
                out_file.write(f"\n{'─' * 80}\n")
                out_file.write(f"📄 ФАЙЛ {i}/{len(files)}: {relative_path}\n")
                out_file.write(f"{'─' * 80}\n\n")
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as in_file:
                        content = in_file.read()
                        
                        # Добавляем информацию о строках
                        line_count = len(content.split('\n'))
                        out_file.write(f"// Строк: {line_count}\n")
                        out_file.write(f"// Размер: {len(content.encode('utf-8')) / 1024:.2f} KB\n\n")
                        
                        out_file.write(content)
                        
                        if not content.endswith('\n'):
                            out_file.write('\n')
                            
                except UnicodeDecodeError:
                    out_file.write("// [ОШИБКА: Невозможно прочитать файл - бинарный формат]\n")
                except Exception as e:
                    out_file.write(f"// [ОШИБКА: {str(e)}]\n")
        
        # Финальный отчет
        print("\n" + "=" * 50)
        print("✅ ДАМП ПРОЕКТА СОЗДАН")
        print("=" * 50)
        print(f"📁 Файл: {self.output_file}")
        print(f"📊 Обработано файлов: {self.stats['total_files']}")
        print(f"📏 Размер дампа: {os.path.getsize(self.output_file) / 1024:.2f} KB")
        print(f"📝 Всего строк в дампе: {self.stats['total_lines']:,}")
        
        # Показываем первые 5 файлов для проверки
        print("\n🔍 Первые 5 файлов в дампе:")
        for i, file_path in enumerate(files[:5]):
            print(f"  {i+1}. {os.path.relpath(file_path, self.project_path)}")

def main():
    print("🚀 Xcode Project Dumper для Google Gemini")
    print("=" * 40)
    
    # Получаем путь к проекту
    project_path = input("Введите путь к Xcode проекту: ").strip()
    project_path = project_path.strip('"\'')
    
    if not os.path.exists(project_path):
        print("❌ Путь не существует!")
        return
    
    # Имя выходного файла
    output_file = input("Имя выходного файла [project_dump.txt]: ").strip()
    if not output_file:
        output_file = "project_dump.txt"
    
    # Создаем парсер и запускаем
    parser = XcodeProjectParser(project_path, output_file)
    parser.create_dump()
    
    print(f"\n💡 Совет: Файл {output_file} готов к отправке в Google Gemini!")

if __name__ == "__main__":
    main()
