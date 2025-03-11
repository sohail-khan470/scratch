# Define directories and file paths
BACKUP_DIR="/var/www/ohmywall-backend/db_backup"
COMPARISON_DIR="$BACKUP_DIR/comparisons"
LATEST_BACKUP="$BACKUP_DIR/db_backup_latest.sql"
PREVIOUS_BACKUP="$BACKUP_DIR/db_backup_previous.sql"
LATEST_SCHEMA="$BACKUP_DIR/db_schema_latest.sql"
PREVIOUS_SCHEMA="$BACKUP_DIR/db_schema_previous.sql"
SUCCESS_LOG="$BACKUP_DIR/db_backup_success.log"
FAILURE_LOG="$BACKUP_DIR/db_backup_failure.log"

# Ensure comparison directory exists
mkdir -p $COMPARISON_DIR

# Take the latest database backup
/usr/bin/mysqldump -u root ohmywall > $LATEST_BACKUP 2>> $FAILURE_LOG

# Check if mysqldump was successful
if [ $? -eq 0 ]; then
    echo "$(date +%Y-%m-%d\ %H:%M:%S) - Backup dump taken successfully." >> $SUCCESS_LOG

    # Take the schema backup (structure of tables)
    /usr/bin/mysqldump -u root --no-data  > $LATEST_SCHEMA 2>> $FAILURE_LOG

    if [ $? -eq 0 ]; then
        echo "$(date +%Y-%m-%d\ %H:%M:%S) - Schema backup taken successfully." >> $SUCCESS_LOG

        # Compare and log schema changes
        if [ -f "$PREVIOUS_SCHEMA" ]; then
            diff $LATEST_SCHEMA $PREVIOUS_SCHEMA > "$COMPARISON_DIR/temp_schema_comparison.diff"

            if [ -s "$COMPARISON_DIR/temp_schema_comparison.diff" ]; then
                NEW_LOG="$COMPARISON_DIR/last_schema_comparison_1.log"
                echo "$(date +%Y-%m-%d\ %H:%M:%S) - Schema changes detected." > $NEW_LOG
                cat "$COMPARISON_DIR/temp_schema_comparison.diff" >> $NEW_LOG

                for i in {29..1}; do
                    if [ -f "$COMPARISON_DIR/last_schema_comparison_$i.log" ]; then
                        mv "$COMPARISON_DIR/last_schema_comparison_$i.log" "$COMPARISON_DIR/last_schema_comparison_$((i+1)).log"
                    fi
                done
            else
                echo "$(date +%Y-%m-%d\ %H:%M:%S) - No schema changes detected." >> "$COMPARISON_DIR/no_schema_changes.log"
            fi

        else
            echo "$(date +%Y-%m-%d\ %H:%M:%S) - Initial schema backup. No previous schema to compare." > "$COMPARISON_DIR/last_schema_comparison_1.log"
        fi

        cp $LATEST_SCHEMA $PREVIOUS_SCHEMA

    else
        echo "$(date +%Y-%m-%d\ %H:%M:%S) - Schema backup failed." >> $FAILURE_LOG
    fi

    if [ -f "$PREVIOUS_BACKUP" ]; then
        diff --unified $LATEST_BACKUP $PREVIOUS_BACKUP > "$COMPARISON_DIR/temp_data_comparison.diff"

        if [ -s "$COMPARISON_DIR/temp_data_comparison.diff" ]; then
            NEW_LOG="$COMPARISON_DIR/last_data_comparison_1.log"
            echo "$(date +%Y-%m-%d\ %H:%M:%S) - Data changes detected." > $NEW_LOG
            cat "$COMPARISON_DIR/temp_data_comparison.diff" >> $NEW_LOG

            for i in {29..1}; do
                if [ -f "$COMPARISON_DIR/last_data_comparison_$i.log" ]; then
                    mv "$COMPARISON_DIR/last_data_comparison_$i.log" "$COMPARISON_DIR/last_data_comparison_$((i+1)).log"
                fi
            done
        else
            echo "$(date +%Y-%m-%d\ %H:%M:%S) - No data changes detected." >> "$COMPARISON_DIR/no_data_changes.log"
        fi

        rm -f "$COMPARISON_DIR/temp_data_comparison.diff"
    else
        echo "$(date +%Y-%m-%d\ %H:%M:%S) - Initial backup comparison. No previous backup to compare." > "$COMPARISON_DIR/last_data_comparison_1.log"
    fi

    cp $LATEST_BACKUP $PREVIOUS_BACKUP

    # Push comparison files to the Git repository
    cd $COMPARISON_DIR
    BRANCH_NAME="comparison-history"

    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        # Stash uncommitted changes
        git stash -u 2>> $FAILURE_LOG
        echo "$(date +%Y-%m-%d\ %H:%M:%S) - Uncommitted changes stashed before branch checkout." >> $SUCCESS_LOG
    fi

    git checkout $BRANCH_NAME 2>> $FAILURE_LOG

    git add . 2>> $FAILURE_LOG
    git commit -m "Database comparison updates on $(date +%Y-%m-%d)" 2>> $FAILURE_LOG
    git push origin $BRANCH_NAME >> $SUCCESS_LOG 2>> $FAILURE_LOG

    if [ $? -eq 0 ]; then
        echo "$(date +%Y-%m-%d\ %H:%M:%S) - Comparison files pushed to Git successfully." >> $SUCCESS_LOG
    else
        echo "$(date +%Y-%m-%d\ %H:%M:%S) - Failed to push comparison files to Git." >> $FAILURE_LOG
    fi

else
    echo "$(date +%Y-%m-%d\ %H:%M:%S) - Backup dump failed." >> $FAILURE_LOG
fi
